const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, UpdateCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const bcrypt = require('bcryptjs');
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
    // Verify authentication and admin privileges
    const authResult = await verifyAuthHeader(event.headers?.Authorization || event.headers?.authorization);
    if (!authResult.valid || !authResult.payload?.userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authentication required' })
      };
    }

    if (!authResult.payload.isAdmin) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Admin privileges required' })
      };
    }

    // Get user ID from path
    const userId = event.pathParameters?.userId;
    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'User ID is required' })
      };
    }

    // Parse request body
    const { email, password, firstName, lastName, phone } = JSON.parse(event.body || '{}');

    // Validate required fields for full user
    if (!password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Password is required for full user conversion' })
      };
    }

    if (!email && !phone) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Either email or phone number is required for full user conversion' })
      };
    }

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid email format' })
        };
      }
    }

    // Validate and normalize phone if provided
    let normalizedPhone = null;
    if (phone) {
      normalizedPhone = phone.replace(/\D/g, ''); // Store phone as digits only
      if (normalizedPhone.length < 10) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Phone number must be at least 10 digits' })
        };
      }
    }

    // Get the current user
    const getCurrentUserResult = await dynamodb.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { userId }
    }));

    if (!getCurrentUserResult.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    const currentUser = getCurrentUserResult.Item;

    // Verify this is actually a stub user
    if (!currentUser.isStub) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'User is not a stub account' })
      };
    }

    // Check if email already exists (excluding current user) - only if email is provided
    if (email) {
      const existingUserQuery = await dynamodb.send(new QueryCommand({
        TableName: USERS_TABLE,
        IndexName: 'email-index',
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: {
          ':email': email.toLowerCase()
        }
      }));

      // Check if any existing user with this email is not the current user
      const emailConflict = existingUserQuery.Items?.find(user => user.userId !== userId);
      if (emailConflict) {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({ error: 'Email already exists for another user' })
        };
      }
    }

    // Check if phone already exists (excluding current user) - only if phone is provided
    if (phone && normalizedPhone) {
      const existingPhoneQuery = await dynamodb.send(new QueryCommand({
        TableName: USERS_TABLE,
        IndexName: 'phone-index',
        KeyConditionExpression: 'phone = :phone',
        ExpressionAttributeValues: {
          ':phone': normalizedPhone
        }
      }));

      // Check if any existing user with this phone is not the current user
      const phoneConflict = existingPhoneQuery.Items?.find(user => user.userId !== userId);
      if (phoneConflict) {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({ error: 'Phone number already exists for another user' })
        };
      }
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Update user to be a full user
    const updateParams = {
      TableName: USERS_TABLE,
      Key: { userId },
      UpdateExpression: 'SET #email = :email, #password = :password, #firstName = :firstName, #lastName = :lastName, #phone = :phone, #isStub = :isStub, #updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#email': 'email',
        '#password': 'password',
        '#firstName': 'firstName',
        '#lastName': 'lastName',
        '#phone': 'phone',
        '#isStub': 'isStub',
        '#updatedAt': 'updatedAt'
      },
      ExpressionAttributeValues: {
        ':email': email ? email.toLowerCase() : null,
        ':password': hashedPassword,
        ':firstName': firstName?.trim() || '',
        ':lastName': lastName?.trim() || '',
        ':phone': normalizedPhone || null,
        ':isStub': false,
        ':updatedAt': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    };


    const result = await dynamodb.send(new UpdateCommand(updateParams));

    // Remove password from response
    const { password: _, ...userResponse } = result.Attributes;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Stub user successfully converted to full user',
        user: userResponse
      })
    };

  } catch (error) {
    console.error('Error converting stub user:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error'
      })
    };
  }
};
