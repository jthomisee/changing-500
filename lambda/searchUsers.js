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

      const query = event.queryStringParameters?.q || '';
      
      const scanParams = {
        TableName: USERS_TABLE,
        FilterExpression: 'contains(#firstName, :query) OR contains(#lastName, :query) OR contains(#email, :query)',
        ExpressionAttributeNames: {
          '#firstName': 'firstName',
          '#lastName': 'lastName',
          '#email': 'email'
        },
        ExpressionAttributeValues: {
          ':query': query.toLowerCase()
        },
        Limit: 20 // Limit results for performance
      };

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
          users: users
        })
      };

    } else if (event.httpMethod === 'POST') {
      // Create stub user from game creation (admin authenticated)
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

      // Create stub user
      const userId = uuidv4();
      const now = new Date().toISOString();
      
      const stubUser = {
        userId,
        email: email ? email.toLowerCase() : null,
        firstName,
        lastName,
        phone: null,
        password: null, // No password for stub users
        isStub: true,
        createdAt: now,
        updatedAt: now
      };

      const putParams = {
        TableName: USERS_TABLE,
        Item: stubUser
      };

      await dynamodb.send(new PutCommand(putParams));
      
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          message: 'Stub user created successfully',
          user: {
            ...stubUser,
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
