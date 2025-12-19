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
      const allGroupGames = [];
      let lastEvaluatedKey = null;

      // Keep querying until we get all games (handle pagination)
      do {
        const gamesParams = {
          TableName: GAMES_TABLE,
          IndexName: 'groupId-index',
          KeyConditionExpression: 'groupId = :groupId',
          ExpressionAttributeValues: { ':groupId': groupId }
        };

        if (lastEvaluatedKey) {
          gamesParams.ExclusiveStartKey = lastEvaluatedKey;
        }

        const gamesResult = await dynamodb.send(new QueryCommand(gamesParams));
        allGroupGames.push(...(gamesResult.Items || []));
        lastEvaluatedKey = gamesResult.LastEvaluatedKey;

        console.log(`Fetched ${gamesResult.Items?.length || 0} games for group ${groupId}, total so far: ${allGroupGames.length}, hasMore: ${!!lastEvaluatedKey}`);
      } while (lastEvaluatedKey);

      console.log(`Final count for group ${groupId}: ${allGroupGames.length} games`);
      return allGroupGames;
    });

    const gamesByGroup = await Promise.all(gameQueries);
    console.log(`Total games from all groups before filtering: ${gamesByGroup.flat().length}`);

    // Flatten all games from all groups
    gamesByGroup.forEach(games => {
      allGames.push(...games);
    });

    // Step 3: Filter to only games where the user participated
    const userGames = allGames.filter(game => {
      return game.results && game.results.some(result => result.userId === userId);
    });
    console.log(`After filtering for user ${userId}: ${userGames.length} games`);

    // Step 4: Remove duplicates (in case user is in multiple groups with overlapping games)
    const uniqueGames = userGames.reduce((unique, game) => {
      const existing = unique.find(g => g.id === game.id);
      if (!existing) {
        unique.push(game);
      }
      return unique;
    }, []);
    console.log(`After deduplication: ${uniqueGames.length} unique games`);

    // Step 5: Sort by date (newest first)
    uniqueGames.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      return dateCompare !== 0 ? dateCompare : (b.gameNumber || 0) - (a.gameNumber || 0);
    });

    console.log(`Returning ${uniqueGames.length} games to client`);

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