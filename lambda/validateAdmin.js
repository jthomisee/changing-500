const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const crypto = require('crypto');

const ssmClient = new SSMClient({ region: process.env.AWS_REGION || 'us-east-1' });

// Simple JWT implementation (for production, consider using jsonwebtoken package)
const createJWT = (payload, secret, expiresInHours = 1) => {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const jwtPayload = {
    ...payload,
    iat: now,
    exp: now + (expiresInHours * 3600) // expires in hours
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
    const { password } = JSON.parse(event.body || '{}');
    
    if (!password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Password is required',
          valid: false 
        })
      };
    }

    // Get admin password and JWT secret from Parameter Store
    const [passwordParam, jwtSecretParam] = await Promise.all([
      ssmClient.send(new GetParameterCommand({
        Name: '/dealin-holden/admin-password',
        WithDecryption: true
      })),
      ssmClient.send(new GetParameterCommand({
        Name: '/dealin-holden/jwt-secret',
        WithDecryption: true
      }))
    ]);

    const storedPassword = passwordParam.Parameter.Value;
    const jwtSecret = jwtSecretParam.Parameter.Value;

    // Validate password
    const isValid = password === storedPassword;

    if (!isValid) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          valid: false,
          message: 'Invalid password'
        })
      };
    }

    // Create JWT token for valid authentication
    const token = createJWT(
      { 
        role: 'admin',
        timestamp: Date.now()
      }, 
      jwtSecret, 
      24 // 24 hours expiration
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        valid: true,
        token: token,
        expiresIn: 24 * 3600 // 24 hours in seconds
      })
    };

  } catch (error) {
    console.error('Error validating admin password:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        valid: false 
      })
    };
  }
};