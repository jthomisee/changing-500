const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { verifyAuthHeader } = require('./verifyJWT');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const GROUPS_TABLE = process.env.GROUPS_TABLE_NAME;
const USER_GROUPS_TABLE = process.env.USER_GROUPS_TABLE_NAME;

exports.handler = async (event) => {
  // CORS headers for all responses
  const headers = {
    'Access-Control-Allow-Origin': event.headers?.origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    // Verify authentication
    const authResult = await verifyAuthHeader(event.headers?.Authorization || event.headers?.authorization);
    if (!authResult.valid || !authResult.payload?.userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authentication required' })
      };
    }

    const userId = authResult.payload.userId;
    const groupId = event.pathParameters?.groupId;

    if (!groupId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Group ID is required' })
      };
    }

    // Check if the group exists and is public
    const groupQuery = {
      TableName: GROUPS_TABLE,
      Key: {
        groupId: groupId
      }
    };

    const groupResult = await dynamodb.send(new GetCommand(groupQuery));
    if (!groupResult.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Group not found' })
      };
    }

    const group = groupResult.Item;
    if (!group.isPublic) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Cannot join private group. Invitation required.' })
      };
    }

    // Check if user is already a member of this group
    const membershipQuery = {
      TableName: USER_GROUPS_TABLE,
      Key: {
        userId: userId,
        groupId: groupId
      }
    };

    const existingMembership = await dynamodb.send(new GetCommand(membershipQuery));
    if (existingMembership.Item) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: 'Already a member of this group' })
      };
    }

    // Add user to the group
    const membershipData = {
      userId: userId,
      groupId: groupId,
      role: 'member',
      joinedAt: new Date().toISOString(),
      status: 'active'
    };

    const putCommand = {
      TableName: USER_GROUPS_TABLE,
      Item: membershipData
    };

    await dynamodb.send(new PutCommand(putCommand));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Successfully joined the group',
        group: {
          groupId: group.groupId,
          name: group.name,
          description: group.description,
          isPublic: group.isPublic
        },
        membership: membershipData
      })
    };

  } catch (error) {
    console.error('Error joining group:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to join group',
        details: error.message
      })
    };
  }
};