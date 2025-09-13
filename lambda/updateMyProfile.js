const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, UpdateCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { verifyAuthHeader } = require('./verifyJWT');

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
    // Verify user authorization (any authenticated user can edit their own profile)
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

    const { firstName, lastName, email, phone } = JSON.parse(event.body || '{}');
    
    // Validate required fields
    if (!firstName || !lastName || !email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'First name, last name, and email are required'
        })
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid email format'
        })
      };
    }

    // Get current user to verify they exist
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

    // If email is being changed, check if new email already exists
    if (email.toLowerCase() !== existingUser.email) {
      const existingEmailQuery = {
        TableName: USERS_TABLE,
        IndexName: 'email-index',
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: {
          ':email': email.toLowerCase()
        }
      };

      const existingEmailResult = await dynamodb.send(new QueryCommand(existingEmailQuery));
      if (existingEmailResult.Items && existingEmailResult.Items.length > 0) {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({ 
            error: 'User with this email already exists'
          })
        };
      }
    }

    // Update user profile (NOTE: isAdmin is NOT included - users cannot change their own admin status)
    const now = new Date().toISOString();
    
    const updateParams = {
      TableName: USERS_TABLE,
      Key: { userId: requestingUserId },
      UpdateExpression: 'SET firstName = :firstName, lastName = :lastName, email = :email, phone = :phone, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':firstName': firstName,
        ':lastName': lastName,
        ':email': email.toLowerCase(),
        ':phone': phone || null,
        ':updatedAt': now
      },
      ReturnValues: 'ALL_NEW'
    };

    const result = await dynamodb.send(new UpdateCommand(updateParams));
    
    // Return updated user data without password
    const { password: _, ...updatedUser } = result.Attributes;
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Profile updated successfully',
        user: updatedUser
      })
    };

  } catch (error) {
    console.error('Error updating profile:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error'
      })
    };
  }
};
