const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, BatchGetCommand } = require('@aws-sdk/lib-dynamodb');
const { verifyAuthHeader } = require('./verifyJWT');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const USER_GROUPS_TABLE = process.env.USER_GROUPS_TABLE_NAME;
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
    // Verify authentication
    const authResult = await verifyAuthHeader(event.headers?.Authorization || event.headers?.authorization);
    if (!authResult.valid || !authResult.payload?.userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authentication required' })
      };
    }

    // Get group ID from path
    const groupId = event.pathParameters?.groupId;
    if (!groupId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Group ID is required' })
      };
    }

    const userId = authResult.payload.userId;
    const isAdmin = authResult.payload.isAdmin || false;

    // Check if user has access to this group (is member or admin)
    if (!isAdmin) {
      const membershipResult = await dynamodb.send(new QueryCommand({
        TableName: USER_GROUPS_TABLE,
        KeyConditionExpression: 'userId = :userId AND groupId = :groupId',
        ExpressionAttributeValues: {
          ':userId': userId,
          ':groupId': groupId
        }
      }));

      if (!membershipResult.Items || membershipResult.Items.length === 0) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Access denied. You must be a member of this group.' })
        };
      }
    }

    // Get all users in the group
    const groupMembersResult = await dynamodb.send(new QueryCommand({
      TableName: USER_GROUPS_TABLE,
      IndexName: 'groupId-index', // Assuming there's a GSI on groupId
      KeyConditionExpression: 'groupId = :groupId',
      ExpressionAttributeValues: {
        ':groupId': groupId
      }
    }));

    // Handle case where group has no members yet, but admin should still see themselves
    if (!groupMembersResult.Items || groupMembersResult.Items.length === 0) {
      if (isAdmin) {
        // Get admin user details so they can see themselves in the dropdown
        const adminUserResult = await dynamodb.send(new BatchGetCommand({
          RequestItems: {
            [USERS_TABLE]: {
              Keys: [{ userId: userId }],
              ProjectionExpression: 'userId, firstName, lastName, email, isStub, createdAt'
            }
          }
        }));

        const adminUser = adminUserResult.Responses[USERS_TABLE]?.[0];
        if (adminUser) {
          const formattedAdmin = {
            userId: adminUser.userId,
            firstName: adminUser.firstName || '',
            lastName: adminUser.lastName || '',
            displayName: `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim() || adminUser.email || 'Unknown User',
            email: adminUser.email || '',
            isStub: adminUser.isStub || false,
            createdAt: adminUser.createdAt
          };

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              users: [formattedAdmin],
              count: 1
            })
          };
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          users: [],
          count: 0
        })
      };
    }

    // Get user details for all group members
    const userIds = groupMembersResult.Items.map(item => ({ userId: item.userId }));
    
    // If admin is not in the group members list, add them so they can see themselves as a player option
    const adminAlreadyMember = groupMembersResult.Items.some(item => item.userId === userId);
    if (isAdmin && !adminAlreadyMember) {
      userIds.push({ userId: userId });
    }
    
    const usersResult = await dynamodb.send(new BatchGetCommand({
      RequestItems: {
        [USERS_TABLE]: {
          Keys: userIds,
          ProjectionExpression: 'userId, firstName, lastName, email, isStub, createdAt'
        }
      }
    }));

    const users = usersResult.Responses[USERS_TABLE] || [];

    // Format users for frontend consumption
    const formattedUsers = users.map(user => ({
      userId: user.userId,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      displayName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown User',
      email: user.email || '',
      isStub: user.isStub || false,
      createdAt: user.createdAt
    }));

    // Sort users: non-stub users first, then by name
    formattedUsers.sort((a, b) => {
      // Non-stub users first
      if (a.isStub && !b.isStub) return 1;
      if (!a.isStub && b.isStub) return -1;
      
      // Then by display name
      return a.displayName.localeCompare(b.displayName);
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        users: formattedUsers,
        count: formattedUsers.length
      })
    };

  } catch (error) {
    console.error('Error listing group users:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error'
      })
    };
  }
};
