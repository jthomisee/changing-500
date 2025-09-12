const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const { verifyAuthHeader } = require('./verifyJWT');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,GET,POST'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers
    };
  }

  // Verify JWT token for authentication
  const authResult = await verifyAuthHeader(event);
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
    const gameData = JSON.parse(event.body);
    
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
    
    // Generate unique ID
    const id = `game_${gameData.date.replace(/-/g, '')}_${gameData.gameNumber}_${uuidv4().substring(0, 8)}`;
    
    const item = {
      ...gameData,
      results: resultsWithTies,
      id,
      createdAt: gameData.createdAt || new Date().toISOString()
    };

    const params = {
      TableName: TABLE_NAME,
      Item: item
    };

    await dynamodb.send(new PutCommand(params));
    
    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        id: item.id,
        message: 'Game created successfully'
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to create game'
      })
    };
  }
};