const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, DeleteCommand, QueryCommand, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');
const { verifyAuthHeader } = require('./verifyJWT');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const USERS_TABLE = process.env.USERS_TABLE_NAME;
const USER_GROUPS_TABLE = process.env.USER_GROUPS_TABLE_NAME;
const GAMES_TABLE = process.env.GAMES_TABLE_NAME || process.env.TABLE_NAME;

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
    // Verify JWT token and admin privileges
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    const authResult = await verifyAuthHeader(authHeader);

    if (!authResult.valid || !authResult.payload || !authResult.payload.isAdmin) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized: Admin access required' })
      };
    }

    const { userId } = event.pathParameters;
    const adminUserId = authResult.payload.userId;

    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'User ID is required' })
      };
    }

    // Prevent admin from deleting themselves
    if (userId === adminUserId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Cannot delete your own account' })
      };
    }

    // Check if user exists
    const userResult = await dynamodb.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { userId }
    }));

    if (!userResult.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    const userToDelete = userResult.Item;

    // Check if user has any games (as creator or participant)
    let hasGames = false;
    try {
      // Check if user created any games
      const createdGamesResult = await dynamodb.send(new QueryCommand({
        TableName: GAMES_TABLE,
        IndexName: 'createdBy-index', // Assuming this index exists
        KeyConditionExpression: 'createdBy = :userId',
        ExpressionAttributeValues: { ':userId': userId },
        Limit: 1
      }));

      if (createdGamesResult.Items && createdGamesResult.Items.length > 0) {
        hasGames = true;
      }

      // If no created games, check if user participated in any games
      if (!hasGames) {
        // This would require scanning all games and checking results arrays
        // For now, we'll proceed with deletion and handle game data cleanup
        // In a production system, you might want to implement a more thorough check
      }
    } catch (error) {
      console.warn('Could not check user games:', error.message);
      // Continue with deletion even if we can't check games
    }

    // Get user's group memberships
    const userGroupsResult = await dynamodb.send(new QueryCommand({
      TableName: USER_GROUPS_TABLE,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId }
    }));

    const userGroups = userGroupsResult.Items || [];

    // If user has games or is a group owner, provide warning but allow deletion
    let warnings = [];
    
    if (hasGames) {
      warnings.push('User has created games that will remain but lose creator reference');
    }

    const ownedGroups = userGroups.filter(membership => membership.role === 'owner');
    if (ownedGroups.length > 0) {
      warnings.push(`User is an owner of ${ownedGroups.length} group(s). Groups will lose this owner.`);
    }

    // Start deletion process
    const deleteOperations = [];

    // 1. Delete user from USER_GROUPS_TABLE
    for (const membership of userGroups) {
      deleteOperations.push({
        DeleteRequest: {
          Key: {
            userId: userId,
            groupId: membership.groupId
          }
        }
      });
    }

    // Execute batch delete for group memberships
    if (deleteOperations.length > 0) {
      // DynamoDB batch operations have a limit of 25 items
      const batchSize = 25;
      for (let i = 0; i < deleteOperations.length; i += batchSize) {
        const batch = deleteOperations.slice(i, i + batchSize);
        
        await dynamodb.send(new BatchWriteCommand({
          RequestItems: {
            [USER_GROUPS_TABLE]: batch
          }
        }));
      }
    }

    // 2. Delete user from USERS_TABLE
    await dynamodb.send(new DeleteCommand({
      TableName: USERS_TABLE,
      Key: { userId }
    }));

    // Note: Games with this user in results arrays will still contain the user data
    // but the user account will be deleted. In a production system, you might want to:
    // 1. Replace user references in games with "Deleted User" placeholder
    // 2. Or prevent deletion if user has game participation
    // 3. Or implement a soft delete with isDeleted flag

    const response = {
      message: 'User deleted successfully',
      deletedUser: {
        userId: userToDelete.userId,
        email: userToDelete.email,
        firstName: userToDelete.firstName,
        lastName: userToDelete.lastName
      },
      deletedMemberships: userGroups.length,
      deletedAt: new Date().toISOString(),
      deletedBy: adminUserId
    };

    if (warnings.length > 0) {
      response.warnings = warnings;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('Error deleting user:', error);
    
    // Check if it's a specific DynamoDB error
    if (error.name === 'ConditionalCheckFailedException') {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found or already deleted' })
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to delete user',
        details: error.message 
      })
    };
  }
};
