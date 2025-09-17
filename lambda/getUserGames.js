const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const GAMES_TABLE = process.env.TABLE_NAME;
const USER_GROUPS_TABLE = process.env.USER_GROUPS_TABLE_NAME;

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,GET'
  };

  try {
    const qs = event.queryStringParameters || {};
    const userId = qs.userId;

    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'userId query parameter is required'
        })
      };
    }

    // Step 1: Get user's groups
    const userGroupsParams = {
      TableName: USER_GROUPS_TABLE,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId }
    };

    const userGroupsResult = await dynamodb.send(new QueryCommand(userGroupsParams));
    const userGroups = userGroupsResult.Items || [];

    if (userGroups.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          games: []
        })
      };
    }

    // Step 2: Get games for each group the user belongs to
    const allGames = [];
    const groupIds = userGroups.map(ug => ug.groupId);

    // Query games for each group in parallel
    const gameQueries = groupIds.map(async (groupId) => {
      const gamesParams = {
        TableName: GAMES_TABLE,
        IndexName: 'groupId-index',
        KeyConditionExpression: 'groupId = :groupId',
        ExpressionAttributeValues: { ':groupId': groupId }
      };

      const gamesResult = await dynamodb.send(new QueryCommand(gamesParams));
      return gamesResult.Items || [];
    });

    const gamesByGroup = await Promise.all(gameQueries);

    // Flatten all games from all groups
    gamesByGroup.forEach(games => {
      allGames.push(...games);
    });

    // Step 3: Filter to only games where the user participated
    const userGames = allGames.filter(game => {
      return game.results && game.results.some(result => result.userId === userId);
    });

    // Step 4: Remove duplicates (in case user is in multiple groups with overlapping games)
    const uniqueGames = userGames.reduce((unique, game) => {
      const existing = unique.find(g => g.id === game.id);
      if (!existing) {
        unique.push(game);
      }
      return unique;
    }, []);

    // Step 5: Sort by date (newest first)
    uniqueGames.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      return dateCompare !== 0 ? dateCompare : (b.gameNumber || 0) - (a.gameNumber || 0);
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        games: uniqueGames
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to retrieve user games'
      })
    };
  }
};