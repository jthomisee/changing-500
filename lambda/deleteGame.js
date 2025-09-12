const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, DeleteCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { verifyAuthHeader } = require('./verifyJWT');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME;

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
    const gameId = event.pathParameters.id;
    
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
    
    // Delete the game
    const deleteParams = {
      TableName: TABLE_NAME,
      Key: { id: gameId }
    };

    await dynamodb.send(new DeleteCommand(deleteParams));
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Game deleted successfully'
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to delete game'
      })
    };
  }
};