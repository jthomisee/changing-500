const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { verifyAuthHeader } = require('./verifyJWT');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const USERS_TABLE = process.env.USERS_TABLE_NAME;

exports.handler = async (event) => {
  // CORS headers for all responses
  const headers = {
    'Access-Control-Allow-Origin': event.headers?.origin || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

    // Check if user is admin
    if (!authResult.payload || !authResult.payload.isAdmin) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Admin privileges required' })
      };
    }

    // Get query parameters for pagination and search
    const { limit = '50', lastEvaluatedKey, search } = event.queryStringParameters || {};

    let scanParams = {
      TableName: USERS_TABLE,
      Limit: parseInt(limit)
    };

    // Add pagination
    if (lastEvaluatedKey) {
      try {
        scanParams.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastEvaluatedKey));
      } catch (error) {
        console.error('Invalid lastEvaluatedKey:', error);
      }
    }

    // Add search filter if provided
    if (search) {
      const searchTerm = search.toLowerCase();
      scanParams.FilterExpression = 'contains(#firstName, :search) OR contains(#lastName, :search) OR contains(#email, :search)';
      scanParams.ExpressionAttributeNames = {
        '#firstName': 'firstName',
        '#lastName': 'lastName',
        '#email': 'email'
      };
      scanParams.ExpressionAttributeValues = {
        ':search': searchTerm
      };
    }

    const result = await dynamodb.send(new ScanCommand(scanParams));
    
    // Remove passwords from response
    const users = result.Items.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    const response = {
      users,
      count: users.length,
      totalScanned: result.ScannedCount || 0
    };

    // Add pagination info if there are more results
    if (result.LastEvaluatedKey) {
      response.lastEvaluatedKey = encodeURIComponent(JSON.stringify(result.LastEvaluatedKey));
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('Error listing users:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error'
      })
    };
  }
};
