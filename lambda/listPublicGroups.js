const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { verifyAuthHeader } = require('./verifyJWT');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const GROUPS_TABLE = process.env.GROUPS_TABLE_NAME;
const USER_GROUPS_TABLE = process.env.USER_GROUPS_TABLE_NAME;

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
    // Verify user authentication
    const authResult = await verifyAuthHeader(event.headers?.Authorization || event.headers?.authorization);
    if (!authResult.valid) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    const userId = authResult.payload?.userId;
    if (!userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token' })
      };
    }

    // Get query parameters
    const queryParams = event.queryStringParameters || {};
    const searchTerm = queryParams.search?.trim().toLowerCase() || '';
    const limit = Math.min(parseInt(queryParams.limit) || 20, 100); // Max 100 items
    const lastEvaluatedKey = queryParams.lastKey ? JSON.parse(decodeURIComponent(queryParams.lastKey)) : undefined;

    // Query public groups using GSI
    const queryCommand = {
      TableName: GROUPS_TABLE,
      IndexName: 'isPublic-createdAt-index', // We'll create this GSI
      KeyConditionExpression: 'isPublic = :isPublic',
      ExpressionAttributeValues: {
        ':isPublic': 'true'
      },
      ScanIndexForward: false, // Most recent first
      Limit: limit,
      ExclusiveStartKey: lastEvaluatedKey
    };

    // Add filter for search term if provided
    if (searchTerm) {
      queryCommand.FilterExpression = 'contains(#name, :searchTerm) OR contains(#description, :searchTerm)';
      queryCommand.ExpressionAttributeNames = {
        '#name': 'name',
        '#description': 'description'
      };
      queryCommand.ExpressionAttributeValues[':searchTerm'] = searchTerm;
    }

    const result = await dynamodb.send(new QueryCommand(queryCommand));

    // Get user's current group memberships to mark joined groups
    const userGroupsQuery = {
      TableName: USER_GROUPS_TABLE,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    };

    const userGroupsResult = await dynamodb.send(new QueryCommand(userGroupsQuery));
    const userGroupIds = new Set(userGroupsResult.Items?.map(item => item.groupId) || []);

    // Enhance groups with user membership status
    const groups = result.Items?.map(group => ({
      ...group,
      isPublic: group.isPublic === 'true', // Convert string back to boolean
      isJoined: userGroupIds.has(group.groupId),
      // Remove sensitive information
      createdBy: undefined
    })) || [];

    // Prepare pagination info
    const pagination = {
      hasMore: !!result.LastEvaluatedKey,
      lastKey: result.LastEvaluatedKey ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey)) : null,
      count: groups.length
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        groups,
        pagination,
        searchTerm: searchTerm || null
      })
    };

  } catch (error) {
    console.error('Error listing public groups:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error'
      })
    };
  }
};