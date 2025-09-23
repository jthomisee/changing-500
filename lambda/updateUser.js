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
    // Verify admin authorization
    const authResult = await verifyAuthHeader(event.headers?.Authorization || event.headers?.authorization);
    if (!authResult.valid) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    // For this endpoint, we need to verify the requesting user is admin
    // We'll need to fetch the user from the token to check admin status
    const requestingUserId = authResult.payload?.userId;
    if (!requestingUserId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token' })
      };
    }

    // Get requesting user to verify admin status
    const requestingUserResult = await dynamodb.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { userId: requestingUserId }
    }));

    if (!requestingUserResult.Item || !requestingUserResult.Item.isAdmin) {
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

    const { firstName, lastName, email, phone, isAdmin } = JSON.parse(event.body || '{}');
    
    // Validate required fields
    if (!firstName || !lastName) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'First name and last name are required'
        })
      };
    }

    // Require at least one of email or phone
    if (!email && !phone) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Either email or phone number is required'
        })
      };
    }

    // Validate email format if provided
    if (email) {
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
    }

    // Check if user exists
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

    const existingUser = userResult.Item;

    // If email is being changed, check if new email already exists
    if (email && email.toLowerCase() !== existingUser.email) {
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

    // Update user
    const now = new Date().toISOString();

    // Build update expression and values conditionally
    let updateExpression = 'SET firstName = :firstName, lastName = :lastName, isAdmin = :isAdmin, updatedAt = :updatedAt';
    let expressionAttributeValues = {
      ':firstName': firstName,
      ':lastName': lastName,
      ':isAdmin': Boolean(isAdmin),
      ':updatedAt': now
    };

    // Handle email field - only set if provided, remove if empty
    if (email && email.trim()) {
      updateExpression += ', email = :email';
      expressionAttributeValues[':email'] = email.toLowerCase();
    } else {
      // Remove email field entirely when empty to avoid GSI issues
      updateExpression += ' REMOVE email';
    }

    // Handle phone field - only set if provided, remove if empty
    if (phone && phone.trim()) {
      updateExpression += ', phone = :phone';
      expressionAttributeValues[':phone'] = phone.trim();
    } else {
      // Remove phone field entirely when empty to avoid GSI issues
      updateExpression += ' REMOVE phone';
    }

    const updateParams = {
      TableName: USERS_TABLE,
      Key: { userId },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    };

    const result = await dynamodb.send(new UpdateCommand(updateParams));
    
    // Return updated user data without password
    const { password: _, ...updatedUser } = result.Attributes;
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'User updated successfully',
        user: updatedUser
      })
    };

  } catch (error) {
    console.error('Error updating user:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error'
      })
    };
  }
};
