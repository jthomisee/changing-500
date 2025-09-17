const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Initialize clients outside handler for connection reuse
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  maxAttempts: 3,
  requestTimeout: 5000
});
const dynamodb = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true
  }
});
const ssmClient = new SSMClient({
  region: process.env.AWS_REGION || 'us-east-1',
  maxAttempts: 3,
  requestTimeout: 5000
});

const USERS_TABLE = process.env.USERS_TABLE_NAME;

// Cache JWT secret to avoid repeated SSM calls
let cachedJwtSecret = null;

// JWT creation function
const createJWT = (payload, secret, expiresInHours = 24) => {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const jwtPayload = {
    ...payload,
    iat: now,
    exp: now + (expiresInHours * 3600)
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(jwtPayload)).toString('base64url');
  
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
};

exports.handler = async (event) => {
  const startTime = Date.now();
  console.log(`[LOGIN] Started at ${new Date().toISOString()}`);

  // CORS headers for all responses
  const headers = {
    'Access-Control-Allow-Origin': event.headers?.origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'false'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const { username, password } = JSON.parse(event.body || '{}');
    
    if (!username || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Username (email or phone) and password are required'
        })
      };
    }

    let user = null;

    // Determine if username is email or phone
    const isEmail = username.includes('@');
    console.log(`[LOGIN] ${Date.now() - startTime}ms - Starting user lookup for ${isEmail ? 'email' : 'phone'}`);

    if (isEmail) {
      // Find user by email
      const emailQuery = {
        TableName: USERS_TABLE,
        IndexName: 'email-index',
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: {
          ':email': username.toLowerCase()
        },
        Limit: 1, // Only need first match
        ConsistentRead: false, // Eventually consistent is faster for GSI
        ReturnConsumedCapacity: 'NONE' // Reduce response payload
      };
      const emailResult = await dynamodb.send(new QueryCommand(emailQuery));
      console.log(`[LOGIN] ${Date.now() - startTime}ms - Email query completed (${emailResult.Items?.length || 0} items)`);
      if (emailResult.Items && emailResult.Items.length > 0) {
        user = emailResult.Items[0];
      }
    } else {
      // Find user by phone
      const normalizedPhone = username.replace(/\D/g, ''); // Remove non-digits
      const phoneQuery = {
        TableName: USERS_TABLE,
        IndexName: 'phone-index',
        KeyConditionExpression: 'phone = :phone',
        ExpressionAttributeValues: {
          ':phone': normalizedPhone
        },
        Limit: 1, // Only need first match
        ConsistentRead: false, // Eventually consistent is faster for GSI
        ReturnConsumedCapacity: 'NONE' // Reduce response payload
      };
      const phoneResult = await dynamodb.send(new QueryCommand(phoneQuery));
      console.log(`[LOGIN] ${Date.now() - startTime}ms - Phone query completed (${phoneResult.Items?.length || 0} items)`);
      if (phoneResult.Items && phoneResult.Items.length > 0) {
        user = phoneResult.Items[0];
      }
    }
    
    if (!user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid username or password'
        })
      };
    }

    // Verify password
    console.log(`[LOGIN] ${Date.now() - startTime}ms - Starting password verification`);
    const passwordStartTime = Date.now();
    const validPassword = await bcrypt.compare(password, user.password);
    const passwordDuration = Date.now() - passwordStartTime;
    console.log(`[LOGIN] ${Date.now() - startTime}ms - Password verification completed (took ${passwordDuration}ms)`);

    if (!validPassword) {
      console.log(`[LOGIN] ${Date.now() - startTime}ms - Invalid password for user`);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          error: 'Invalid username or password'
        })
      };
    }

    // Check if password needs rehashing (migrate from high salt rounds to 10)
    let needsRehash = false;
    let currentRounds = 0;
    try {
      // Extract salt rounds from hash (format: $2a$rounds$salt...)
      const hashParts = user.password.split('$');
      if (hashParts.length >= 3) {
        currentRounds = parseInt(hashParts[2]);
        needsRehash = currentRounds > 10;
      }
    } catch (e) {
      // Ignore errors in hash parsing
    }
    console.log(`[LOGIN] ${Date.now() - startTime}ms - Password analysis: ${currentRounds} rounds, needsRehash: ${needsRehash}`);

    // Rehash password with 10 rounds for faster future logins (async, don't block response)
    if (needsRehash) {
      console.log(`[LOGIN] ${Date.now() - startTime}ms - Starting async password rehash`);
      // Fire and forget - don't await this operation
      bcrypt.hash(password, 10).then(async (newHashedPassword) => {
        try {
          await dynamodb.send(new UpdateCommand({
            TableName: USERS_TABLE,
            Key: { userId: user.userId },
            UpdateExpression: 'SET password = :password',
            ExpressionAttributeValues: {
              ':password': newHashedPassword
            }
          }));
          console.log(`[LOGIN] Password rehash completed for user ${user.userId}`);
        } catch (rehashError) {
          console.warn(`[LOGIN] Failed to rehash password for user ${user.userId}:`, rehashError);
        }
      }).catch(hashError => {
        console.warn(`[LOGIN] Failed to hash new password for user ${user.userId}:`, hashError);
      });
    }

    // Get JWT secret (cached to avoid repeated SSM calls)
    if (!cachedJwtSecret) {
      console.log(`[LOGIN] ${Date.now() - startTime}ms - Fetching JWT secret from SSM`);
      const ssmStartTime = Date.now();
      const getParameterCommand = new GetParameterCommand({
        Name: '/changing-500/jwt-secret',
        WithDecryption: true
      });

      const parameterResponse = await ssmClient.send(getParameterCommand);
      cachedJwtSecret = parameterResponse.Parameter.Value;
      const ssmDuration = Date.now() - ssmStartTime;
      console.log(`[LOGIN] ${Date.now() - startTime}ms - JWT secret fetched from SSM (took ${ssmDuration}ms)`);
    } else {
      console.log(`[LOGIN] ${Date.now() - startTime}ms - Using cached JWT secret`);
    }

    const jwtSecret = cachedJwtSecret;

    // Create JWT token
    console.log(`[LOGIN] ${Date.now() - startTime}ms - Creating JWT token`);
    const token = createJWT(
      {
        userId: user.userId,
        email: user.email,
        phone: user.phone,
        role: 'user',
        isAdmin: user.isAdmin || false,
        timestamp: Date.now()
      },
      jwtSecret,
      24 // 24 hours expiration
    );

    // Return user data without password
    const { password: _, ...userResponse } = user;

    console.log(`[LOGIN] ${Date.now() - startTime}ms - Login completed successfully`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Login successful',
        user: userResponse,
        token: token,
        expiresIn: 24 * 3600 // 24 hours in seconds
      })
    };

  } catch (error) {
    console.error('Error logging in user:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error'
      })
    };
  }
};
