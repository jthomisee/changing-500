const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, DeleteCommand, GetCommand, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { verifyAuthHeader } = require('./verifyJWT');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const GROUPS_TABLE = process.env.GROUPS_TABLE_NAME;
const USER_GROUPS_TABLE = process.env.USER_GROUPS_TABLE_NAME;
const GAMES_TABLE = process.env.TABLE_NAME;

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,DELETE'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers
    };
  }

  // Verify JWT token for authentication
  const authResult = await verifyAuthHeader(event.headers?.Authorization || event.headers?.authorization);
  if (!authResult.valid) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({
        error: 'Unauthorized: ' + (authResult.error || 'Invalid token')
      })
    };
  }

  try {
    const groupId = event.pathParameters?.groupId;

    if (!groupId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Group ID is required'
        })
      };
    }

    // First, check if the group exists
    const getParams = {
      TableName: GROUPS_TABLE,
      Key: { groupId }
    };

    const existingGroup = await dynamodb.send(new GetCommand(getParams));
    if (!existingGroup.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'Group not found'
        })
      };
    }

    // Check if user has permission to delete this group
    const userId = authResult.payload?.userId;
    const isAdmin = authResult.payload?.isAdmin || false;

    if (!isAdmin) {
      // Check if user is an owner of the group
      const membershipResult = await dynamodb.send(new GetCommand({
        TableName: USER_GROUPS_TABLE,
        Key: { userId, groupId }
      }));

      if (!membershipResult.Item || membershipResult.Item.role !== 'owner') {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({
            error: 'Only group owners can delete this group'
          })
        };
      }
    }

    // Find and delete all games associated with this group
    const gamesQuery = {
      TableName: GAMES_TABLE,
      FilterExpression: 'groupId = :groupId',
      ExpressionAttributeValues: {
        ':groupId': groupId
      }
    };

    const gamesResult = await dynamodb.send(new ScanCommand(gamesQuery));
    const games = gamesResult.Items || [];

    // Delete all games in the group
    for (const game of games) {
      const deleteGameParams = {
        TableName: GAMES_TABLE,
        Key: { id: game.id }
      };
      await dynamodb.send(new DeleteCommand(deleteGameParams));
    }

    // Get all group memberships to delete
    const membershipsQuery = {
      TableName: USER_GROUPS_TABLE,
      FilterExpression: 'groupId = :groupId',
      ExpressionAttributeValues: {
        ':groupId': groupId
      }
    };

    const membershipsResult = await dynamodb.send(new ScanCommand(membershipsQuery));
    const memberships = membershipsResult.Items || [];

    // Delete all group memberships first
    for (const membership of memberships) {
      const deleteMembershipParams = {
        TableName: USER_GROUPS_TABLE,
        Key: {
          userId: membership.userId,
          groupId: membership.groupId
        }
      };
      await dynamodb.send(new DeleteCommand(deleteMembershipParams));
    }

    // Delete the group
    const deleteGroupParams = {
      TableName: GROUPS_TABLE,
      Key: { groupId }
    };

    await dynamodb.send(new DeleteCommand(deleteGroupParams));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Group deleted successfully',
        deletedGames: games.length,
        deletedMemberships: memberships.length
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to delete group'
      })
    };
  }
};