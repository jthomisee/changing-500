const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { verifyAuthHeader } = require('./verifyJWT');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const USERS_TABLE = process.env.USERS_TABLE_NAME;

exports.handler = async (event) => {
  // CORS headers for all responses
  const headers = {
    'Access-Control-Allow-Origin': event.headers?.origin || '*',
    'Access-Control-Allow-Methods': 'PUT, OPTIONS',
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
    // Verify admin authorization
    const authResult = await verifyAuthHeader(event.headers?.Authorization || event.headers?.authorization);
    if (!authResult.valid) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    // Check if requesting user is admin
    if (!authResult.payload || !authResult.payload.isAdmin) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Admin privileges required' })
      };
    }

    const userId = event.pathParameters?.userId;
    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'User ID is required' })
      };
    }

    // Check if target user exists
    const userResult = await dynamodb.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { userId }
    }));

    if (!userResult.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    const targetUser = userResult.Item;

    // Generate a temporary password
    const tempPassword = generateTempPassword();
    
    // Hash the temporary password
    const saltRounds = 10;
    const hashedTempPassword = await bcrypt.hash(tempPassword, saltRounds);

    // Update user with new password and mark as requiring password change
    const now = new Date().toISOString();
    
    const updateParams = {
      TableName: USERS_TABLE,
      Key: { userId },
      UpdateExpression: 'SET password = :password, passwordResetRequired = :passwordResetRequired, updatedAt = :updatedAt, passwordResetAt = :passwordResetAt, passwordResetBy = :passwordResetBy',
      ExpressionAttributeValues: {
        ':password': hashedTempPassword,
        ':passwordResetRequired': true,
        ':updatedAt': now,
        ':passwordResetAt': now,
        ':passwordResetBy': authResult.payload.userId
      },
      ReturnValues: 'ALL_NEW'
    };

    const result = await dynamodb.send(new UpdateCommand(updateParams));
    
    // Return success with temporary password (admin needs to communicate this to user)
    const { password: _, ...updatedUser } = result.Attributes;
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Password reset successfully',
        user: updatedUser,
        tempPassword: tempPassword, // Only returned to admin
        instructions: 'Please securely communicate this temporary password to the user. They will be required to change it on next login.'
      })
    };

  } catch (error) {
    console.error('Error resetting user password:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error'
      })
    };
  }
};

// Generate a secure temporary password
function generateTempPassword() {
  // Generate a random 12-character password with mixed case, numbers, and symbols
  const length = 12;
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
    password += charset[randomIndex];
  }
  
  return password;
}
