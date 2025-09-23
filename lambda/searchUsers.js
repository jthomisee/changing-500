const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const { verifyAuthHeader } = require('./verifyJWT');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const USERS_TABLE = process.env.USERS_TABLE_NAME;

exports.handler = async (event) => {
  // CORS headers for all responses
  const headers = {
    'Access-Control-Allow-Origin': event.headers?.origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
    if (event.httpMethod === 'GET') {
      // Search users for game creation (admin or user authenticated)
      const authResult = await verifyAuthHeader(event.headers?.Authorization || event.headers?.authorization);
      if (!authResult.valid) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({
            error: 'Authentication required'
          })
        };
      }

      const query = event.queryStringParameters?.search || '';
      const limit = Math.min(parseInt(event.queryStringParameters?.limit) || 10, 50); // Default 10, max 50
      const lastEvaluatedKey = event.queryStringParameters?.lastEvaluatedKey;
      const normalizedPhone = query.replace(/\D/g, ''); // Remove non-digits for phone search
      
      let filterExpression = 'contains(#firstName, :query) OR contains(#lastName, :query)';
      const expressionAttributeNames = {
        '#firstName': 'firstName',
        '#lastName': 'lastName'
      };
      const expressionAttributeValues = {
        ':query': query.toLowerCase()
      };

      // Add email search - use exact match if it looks like an email, otherwise partial match
      const isEmailSearch = query.includes('@') && query.includes('.');
      if (isEmailSearch) {
        // For email-like searches, use exact match
        filterExpression += ' OR (attribute_exists(#email) AND #email = :query)';
      } else {
        // For general searches, use partial match
        filterExpression += ' OR (attribute_exists(#email) AND contains(#email, :query))';
      }
      expressionAttributeNames['#email'] = 'email';

      // Add phone search if phone field exists and we have digits to search
      if (normalizedPhone.length >= 3) {
        filterExpression += ' OR (attribute_exists(#phone) AND contains(#phone, :phone))';
        expressionAttributeNames['#phone'] = 'phone';
        expressionAttributeValues[':phone'] = normalizedPhone;
      }
      
      const scanParams = {
        TableName: USERS_TABLE,
        FilterExpression: filterExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        Limit: limit
      };

      // Add pagination if provided
      if (lastEvaluatedKey) {
        try {
          scanParams.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastEvaluatedKey));
        } catch (e) {
          console.error('Invalid lastEvaluatedKey:', e);
        }
      }

      const result = await dynamodb.send(new ScanCommand(scanParams));
      
      // Return users without passwords
      const users = result.Items.map(user => {
        const { password, ...userWithoutPassword } = user;
        return {
          ...userWithoutPassword,
          displayName: `${user.firstName} ${user.lastName}`,
          email: user.email
        };
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          users: users,
          hasMore: !!result.LastEvaluatedKey,
          lastEvaluatedKey: result.LastEvaluatedKey ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey)) : null
        })
      };

    } else if (event.httpMethod === 'POST') {
      // Create user from game creation (admin authenticated)
      const authResult = await verifyAuthHeader(event.headers?.Authorization || event.headers?.authorization);
      if (!authResult.valid || !authResult.payload.isAdmin) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({
            error: 'Admin authentication required'
          })
        };
      }

      const { playerName, email } = JSON.parse(event.body || '{}');
      
      if (!playerName) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Player name is required'
          })
        };
      }

      // Parse first and last name from player name
      const nameParts = playerName.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

      // Create user (requires admin; this path is for manual creation, but we now generally create via group add)
      const userId = uuidv4();
      const now = new Date().toISOString();
      
      const newUser = {
        userId,
        email: email ? email.toLowerCase() : null,
        firstName,
        lastName,
        phone: null,
        password: null,
        createdAt: now,
        updatedAt: now
      };

      const putParams = {
        TableName: USERS_TABLE,
        Item: newUser
      };

      await dynamodb.send(new PutCommand(putParams));
      
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          message: 'User created successfully',
          user: {
            ...newUser,
            displayName: `${firstName} ${lastName}`
          }
        })
      };
    }

  } catch (error) {
    console.error('Error in searchUsers:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error'
      })
    };
  }
};
