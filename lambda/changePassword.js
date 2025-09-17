const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { verifyAuthHeader } = require('./verifyJWT');
const bcrypt = require('bcryptjs');

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
    // Verify user authorization
    const authResult = await verifyAuthHeader(event.headers?.Authorization || event.headers?.authorization);
    if (!authResult.valid) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    const requestingUserId = authResult.payload?.userId;
    if (!requestingUserId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token' })
      };
    }

    const { currentPassword, newPassword } = JSON.parse(event.body || '{}');
    
    // Validate required fields
    if (!currentPassword || !newPassword) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Current password and new password are required'
        })
      };
    }

    // Validate new password strength
    if (newPassword.length < 6) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'New password must be at least 6 characters long'
        })
      };
    }

    // Check if new password is different from current password
    if (currentPassword === newPassword) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'New password must be different from current password'
        })
      };
    }

    // Get current user to verify they exist and get current password hash
    const userResult = await dynamodb.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { userId: requestingUserId }
    }));

    if (!userResult.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    const existingUser = userResult.Item;

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, existingUser.password);
    if (!isCurrentPasswordValid) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Current password is incorrect'
        })
      };
    }

    // Hash new password
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update user password
    const now = new Date().toISOString();
    
    const updateParams = {
      TableName: USERS_TABLE,
      Key: { userId: requestingUserId },
      UpdateExpression: 'SET password = :password, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':password': hashedNewPassword,
        ':updatedAt': now
      },
      ReturnValues: 'ALL_NEW'
    };

    const result = await dynamodb.send(new UpdateCommand(updateParams));
    
    // Return success without password data
    const { password: _, ...updatedUser } = result.Attributes;
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Password changed successfully',
        user: updatedUser
      })
    };

  } catch (error) {
    console.error('Error changing password:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error'
      })
    };
  }
};
