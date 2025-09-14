const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, DeleteCommand, ScanCommand, UpdateCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { verifyAuthHeader } = require('./verifyJWT');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const USERS_TABLE = process.env.USERS_TABLE_NAME;
const GAMES_TABLE = process.env.GAMES_TABLE_NAME;
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

    // Get stub user ID from path
    const stubUserId = event.pathParameters?.userId;
    if (!stubUserId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Stub user ID is required' })
      };
    }

    // Parse request body
    const { targetUserId } = JSON.parse(event.body || '{}');
    if (!targetUserId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Target user ID is required' })
      };
    }

    if (stubUserId === targetUserId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Cannot merge user with themselves' })
      };
    }

    // Get both users
    const [stubUserResult, targetUserResult] = await Promise.all([
      dynamodb.send(new GetCommand({
        TableName: USERS_TABLE,
        Key: { userId: stubUserId }
      })),
      dynamodb.send(new GetCommand({
        TableName: USERS_TABLE,
        Key: { userId: targetUserId }
      }))
    ]);

    if (!stubUserResult.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Stub user not found' })
      };
    }

    if (!targetUserResult.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Target user not found' })
      };
    }

    const stubUser = stubUserResult.Item;
    const targetUser = targetUserResult.Item;

    // Verify the source is actually a stub user
    if (!stubUser.isStub) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Source user is not a stub account' })
      };
    }

    // Verify target is not a stub user
    if (targetUser.isStub) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Target user cannot be a stub account' })
      };
    }

    let mergedGameCount = 0;
    let mergedMembershipCount = 0;

    // Find all games that reference the stub user in their results
    const gamesResult = await dynamodb.send(new ScanCommand({
      TableName: GAMES_TABLE,
      FilterExpression: 'contains(#results, :stubUserId)',
      ExpressionAttributeNames: {
        '#results': 'results'
      },
      ExpressionAttributeValues: {
        ':stubUserId': stubUserId
      }
    }));

    // Update each game that contains the stub user
    for (const game of gamesResult.Items || []) {
      let gameUpdated = false;
      const updatedResults = game.results.map(result => {
        if (result.userId === stubUserId) {
          gameUpdated = true;
          return {
            ...result,
            userId: targetUserId,
            name: `${targetUser.firstName} ${targetUser.lastName}`.trim()
          };
        }
        return result;
      });

      if (gameUpdated) {
        await dynamodb.send(new UpdateCommand({
          TableName: GAMES_TABLE,
          Key: { id: game.id },
          UpdateExpression: 'SET #results = :results, #updatedAt = :updatedAt',
          ExpressionAttributeNames: {
            '#results': 'results',
            '#updatedAt': 'updatedAt'
          },
          ExpressionAttributeValues: {
            ':results': updatedResults,
            ':updatedAt': new Date().toISOString()
          }
        }));
        mergedGameCount++;
      }
    }

    // Find all group memberships for the stub user
    const stubMembershipsResult = await dynamodb.send(new QueryCommand({
      TableName: USER_GROUPS_TABLE,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': stubUserId
      }
    }));

    // Handle group memberships
    for (const membership of stubMembershipsResult.Items || []) {
      // Check if target user is already in this group
      const existingMembershipResult = await dynamodb.send(new GetCommand({
        TableName: USER_GROUPS_TABLE,
        Key: {
          userId: targetUserId,
          groupId: membership.groupId
        }
      }));

      if (!existingMembershipResult.Item) {
        // Target user is not in this group, transfer the membership
        await Promise.all([
          // Add target user to group with same role
          dynamodb.send(new UpdateCommand({
            TableName: USER_GROUPS_TABLE,
            Key: {
              userId: targetUserId,
              groupId: membership.groupId
            },
            UpdateExpression: 'SET #role = :role, #joinedAt = :joinedAt, #addedBy = :addedBy',
            ExpressionAttributeNames: {
              '#role': 'role',
              '#joinedAt': 'joinedAt',
              '#addedBy': 'addedBy'
            },
            ExpressionAttributeValues: {
              ':role': membership.role || 'member',
              ':joinedAt': membership.joinedAt,
              ':addedBy': membership.addedBy
            },
            ConditionExpression: 'attribute_not_exists(userId) AND attribute_not_exists(groupId)'
          })),
          // Remove stub user from group
          dynamodb.send(new DeleteCommand({
            TableName: USER_GROUPS_TABLE,
            Key: {
              userId: stubUserId,
              groupId: membership.groupId
            }
          }))
        ]);
        mergedMembershipCount++;
      } else {
        // Target user is already in group, just remove stub user
        await dynamodb.send(new DeleteCommand({
          TableName: USER_GROUPS_TABLE,
          Key: {
            userId: stubUserId,
            groupId: membership.groupId
          }
        }));
        mergedMembershipCount++;
      }
    }

    // Delete the stub user
    await dynamodb.send(new DeleteCommand({
      TableName: USERS_TABLE,
      Key: { userId: stubUserId }
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Stub user successfully merged',
        summary: {
          deletedUser: {
            userId: stubUser.userId,
            name: `${stubUser.firstName} ${stubUser.lastName}`.trim()
          },
          targetUser: {
            userId: targetUser.userId,
            name: `${targetUser.firstName} ${targetUser.lastName}`.trim()
          },
          mergedGameCount,
          mergedMembershipCount
        }
      })
    };

  } catch (error) {
    console.error('Error merging stub user:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error'
      })
    };
  }
};
