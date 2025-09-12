const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

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

  try {
    const params = {
      TableName: TABLE_NAME
    };

    const result = await dynamodb.send(new ScanCommand(params));
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        games: result.Items.sort((a, b) => {
          const dateCompare = a.date.localeCompare(b.date);
          return dateCompare !== 0 ? dateCompare : a.gameNumber - b.gameNumber;
        })
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to retrieve games'
      })
    };
  }
};