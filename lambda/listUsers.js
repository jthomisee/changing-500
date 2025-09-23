const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
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
    const { limit = '10', lastEvaluatedKey, search } = event.queryStringParameters || {};

    let scanParams = {
      TableName: USERS_TABLE
    };

    // For filtered scans, we need a higher internal limit since DynamoDB's Limit 
    // applies BEFORE filtering. We'll slice the results afterward.
    const requestedLimit = parseInt(limit);
    if (search) {
      // Use higher scan limit when filtering to ensure we find matches
      scanParams.Limit = Math.max(requestedLimit * 10, 100);
    } else {
      // For non-filtered scans, use the requested limit directly
      scanParams.Limit = requestedLimit;
    }

    // Add pagination
    if (lastEvaluatedKey) {
      try {
        scanParams.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastEvaluatedKey));
      } catch (error) {
        console.error('Invalid lastEvaluatedKey:', error);
      }
    }

    // Handle search - use Query for exact email/phone searches, Scan for partial name searches
    if (search) {
      const searchTerm = search.toLowerCase();
      const normalizedPhone = search.replace(/\D/g, ''); // Remove non-digits for phone search
      
      // Check if this is an exact email search
      const isEmailSearch = searchTerm.includes('@') && searchTerm.includes('.');
      const isPhoneSearch = normalizedPhone.length >= 10; // Full phone number
      
      let users = [];
      
      // Try exact email search first using Query (much more efficient)
      if (isEmailSearch) {
        try {
          const emailQuery = {
            TableName: USERS_TABLE,
            IndexName: 'email-index',
            KeyConditionExpression: 'email = :email',
            ExpressionAttributeValues: {
              ':email': searchTerm
            },
            Limit: requestedLimit
          };
          
          const emailResult = await dynamodb.send(new QueryCommand(emailQuery));
          if (emailResult.Items.length > 0) {
            // Found exact email match, return it
            users = emailResult.Items.map(user => {
              const { password, ...userWithoutPassword } = user;
              return userWithoutPassword;
            });
            
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                users,
                count: users.length,
                totalScanned: 1 // Only queried one specific record
              })
            };
          }
        } catch (error) {
          console.error('Email query failed, falling back to scan:', error);
        }
      }
      
      // Try exact phone search using Query (much more efficient)
      if (isPhoneSearch && users.length === 0) {
        try {
          const phoneQuery = {
            TableName: USERS_TABLE,
            IndexName: 'phone-index',
            KeyConditionExpression: 'phone = :phone',
            ExpressionAttributeValues: {
              ':phone': normalizedPhone
            },
            Limit: requestedLimit
          };
          
          const phoneResult = await dynamodb.send(new QueryCommand(phoneQuery));
          if (phoneResult.Items.length > 0) {
            // Found exact phone match, return it
            users = phoneResult.Items.map(user => {
              const { password, ...userWithoutPassword } = user;
              return userWithoutPassword;
            });
            
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                users,
                count: users.length,
                totalScanned: 1 // Only queried one specific record
              })
            };
          }
        } catch (error) {
          console.error('Phone query failed, falling back to scan:', error);
        }
      }
      
      // If no exact matches found, fall back to Scan for partial name searches
      let filterExpression = 'contains(#firstName, :search) OR contains(#lastName, :search)';
      const expressionAttributeNames = {
        '#firstName': 'firstName',
        '#lastName': 'lastName'
      };
      const expressionAttributeValues = {
        ':search': searchTerm
      };

      // Add partial email search for non-email-like searches
      if (!isEmailSearch) {
        filterExpression += ' OR (attribute_exists(#email) AND contains(#email, :search))';
        expressionAttributeNames['#email'] = 'email';
      }

      // Add partial phone search for shorter phone numbers
      if (normalizedPhone.length >= 3 && !isPhoneSearch) {
        filterExpression += ' OR (attribute_exists(#phone) AND contains(#phone, :phone))';
        expressionAttributeNames['#phone'] = 'phone';
        expressionAttributeValues[':phone'] = normalizedPhone;
      }

      scanParams.FilterExpression = filterExpression;
      scanParams.ExpressionAttributeNames = expressionAttributeNames;
      scanParams.ExpressionAttributeValues = expressionAttributeValues;
    }

    const result = await dynamodb.send(new ScanCommand(scanParams));
    
    // Remove passwords from response
    let users = result.Items.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    // If we used a higher scan limit for filtering, slice results to requested limit
    if (search && users.length > requestedLimit) {
      users = users.slice(0, requestedLimit);
    }

    const response = {
      users,
      count: users.length,
      totalScanned: result.ScannedCount || 0,
      hasMore: !!result.LastEvaluatedKey
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
