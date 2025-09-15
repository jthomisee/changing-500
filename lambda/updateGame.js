const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { verifyAuthHeader } = require('./verifyJWT');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME;
const USER_GROUPS_TABLE = process.env.USER_GROUPS_TABLE_NAME;

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT'
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
    const gameId = event.pathParameters.id;
    const gameData = JSON.parse(event.body);
    
    // First, check if the game exists
    const getParams = {
      TableName: TABLE_NAME,
      Key: { id: gameId }
    };
    
    const existingGame = await dynamodb.send(new GetCommand(getParams));
    if (!existingGame.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'Game not found'
        })
      };
    }

    // Get the current game to check its group
    const currentGame = existingGame.Item;
    const groupId = gameData.groupId || currentGame.groupId;

    // Check if user has permission to edit games in this group
    const userId = authResult.payload?.userId;
    const isAdmin = authResult.payload?.isAdmin || false;

    if (!isAdmin) {
      // Check if user is an owner of the group
      if (!groupId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Game must belong to a group' 
          })
        };
      }

      const membershipResult = await dynamodb.send(new GetCommand({
        TableName: USER_GROUPS_TABLE,
        Key: { userId, groupId }
      }));

      if (!membershipResult.Item || membershipResult.Item.role !== 'owner') {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ 
            error: 'Only group owners can edit games for this group' 
          })
        };
      }
    }
    
    // Process results to add rebuys and detect ties
    const processedResults = gameData.results.map(result => ({
      ...result,
      rebuys: result.rebuys || 0 // Default to 0 if not provided
    }));
    
    // Auto-detect ties by grouping results with same position
    const positionGroups = {};
    processedResults.forEach(result => {
      if (result.position) {
        if (!positionGroups[result.position]) {
          positionGroups[result.position] = [];
        }
        positionGroups[result.position].push(result);
      }
    });
    
    // Mark ties automatically
    const resultsWithTies = processedResults.map(result => {
      if (result.position && positionGroups[result.position].length > 1) {
        return { ...result, tied: true };
      }
      return { ...result, tied: false };
    });
    
    // Update the game (preserve existing gameNumber if not provided)
    const updateParams = {
      TableName: TABLE_NAME,
      Key: { id: gameId },
      UpdateExpression: 'SET #date = :date, #time = :time, results = :results, groupId = :groupId, #status = :status, updatedAt = :updatedAt, updatedBy = :updatedBy',
      ExpressionAttributeNames: {
        '#date': 'date', // 'date' is a reserved word in DynamoDB
        '#time': 'time', // 'time' is a reserved word in DynamoDB
        '#status': 'status' // 'status' is a reserved word in DynamoDB
      },
      ExpressionAttributeValues: {
        ':date': gameData.date,
        ':time': gameData.time || null,
        ':results': resultsWithTies,
        ':groupId': groupId,
        ':status': gameData.status || 'completed',
        ':updatedAt': new Date().toISOString(),
        ':updatedBy': userId
      },
      ReturnValues: 'ALL_NEW'
    };


    const result = await dynamodb.send(new UpdateCommand(updateParams));
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Game updated successfully',
        game: result.Attributes
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to update game'
      })
    };
  }
};