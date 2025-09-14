const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const crypto = require('crypto');

const ssmClient = new SSMClient({ region: process.env.AWS_REGION || 'us-east-1' });

// JWT verification function
const verifyJWT = (token, secret) => {
  try {
    const [encodedHeader, encodedPayload, signature] = token.split('.');
    
    if (!encodedHeader || !encodedPayload || !signature) {
      return { valid: false, error: 'Invalid token format' };
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');

    if (signature !== expectedSignature) {
      return { valid: false, error: 'Invalid signature' };
    }

    // Decode payload
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString());
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return { valid: false, error: 'Token expired' };
    }

    return { 
      valid: true, 
      payload: payload 
    };
  } catch (error) {
    return { 
      valid: false, 
      error: 'Token parsing error: ' + error.message 
    };
  }
};

// Helper function to verify JWT from request headers
const verifyAuthHeader = async (authHeader) => {
  try {
    // Get JWT secret from Parameter Store
    const getParameterCommand = new GetParameterCommand({
      Name: '/changing-500/jwt-secret',
      WithDecryption: true
    });

    const parameterResponse = await ssmClient.send(getParameterCommand);
    const jwtSecret = parameterResponse.Parameter.Value;

    if (!authHeader) {
      return { valid: false, error: 'No authorization header' };
    }

    // Expected format: "Bearer <token>"
    const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/);
    if (!tokenMatch) {
      return { valid: false, error: 'Invalid authorization header format' };
    }

    const token = tokenMatch[1];
    
    // Verify the token
    const verification = verifyJWT(token, jwtSecret);
    
    return verification;
  } catch (error) {
    console.error('Error verifying auth header:', error);
    return { 
      valid: false, 
      error: 'Authentication verification failed' 
    };
  }
};

// Lambda handler for standalone JWT verification
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
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    const verification = await verifyAuthHeader(authHeader);
    
    return {
      statusCode: verification.valid ? 200 : 401,
      headers,
      body: JSON.stringify(verification)
    };

  } catch (error) {
    console.error('Error in JWT verification handler:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        valid: false,
        error: 'Internal server error'
      })
    };
  }
};

// Export the verification function for use in other lambdas
exports.verifyAuthHeader = verifyAuthHeader;
exports.verifyJWT = verifyJWT;
