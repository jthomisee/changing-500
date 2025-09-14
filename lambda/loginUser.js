const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);
const ssmClient = new SSMClient({ region: process.env.AWS_REGION || 'us-east-1' });

const USERS_TABLE = process.env.USERS_TABLE_NAME;

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
    
    if (isEmail) {
      // Find user by email
      const emailQuery = {
        TableName: USERS_TABLE,
        IndexName: 'email-index',
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: {
          ':email': username.toLowerCase()
        }
      };
      const emailResult = await dynamodb.send(new QueryCommand(emailQuery));
      if (emailResult.Items.length > 0) {
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
        }
      };
      const phoneResult = await dynamodb.send(new QueryCommand(phoneQuery));
      if (phoneResult.Items.length > 0) {
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

    // Check if user is a stub account (no password set)
    if (user.isStub) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          error: 'This account needs to be activated. Please contact an admin.'
        })
      };
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid username or password'
        })
      };
    }

    // Get JWT secret
    const getParameterCommand = new GetParameterCommand({
      Name: '/changing-500/jwt-secret',
      WithDecryption: true
    });

    const parameterResponse = await ssmClient.send(getParameterCommand);
    const jwtSecret = parameterResponse.Parameter.Value;

    // Create JWT token
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
