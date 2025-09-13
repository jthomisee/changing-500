const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { verifyAuthHeader } = require('./verifyJWT');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME;

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
    
    // Update the game
    const updateParams = {
      TableName: TABLE_NAME,
      Key: { id: gameId },
      UpdateExpression: 'SET #date = :date, gameNumber = :gameNumber, results = :results, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#date': 'date' // 'date' is a reserved word in DynamoDB
      },
      ExpressionAttributeValues: {
        ':date': gameData.date,
        ':gameNumber': gameData.gameNumber,
        ':results': resultsWithTies,
        ':updatedAt': new Date().toISOString()
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