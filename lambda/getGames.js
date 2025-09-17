const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

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
    const qs = event.queryStringParameters || {};
    let items = [];

    if (qs.groupId) {
      // Query games by groupId via groupId-index
      const params = {
        TableName: TABLE_NAME,
        IndexName: 'groupId-index',
        KeyConditionExpression: 'groupId = :groupId',
        ExpressionAttributeValues: { ':groupId': qs.groupId }
      };
      const result = await dynamodb.send(new QueryCommand(params));
      items = result.Items || [];
    } else if ((qs.status || '').toLowerCase() === 'scheduled') {
      // Query scheduled games via status-date-index
      const params = {
        TableName: TABLE_NAME,
        IndexName: 'status-date-index',
        KeyConditionExpression: '#status = :scheduled',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':scheduled': 'scheduled' },
        ScanIndexForward: true
      };
      const result = await dynamodb.send(new QueryCommand(params));
      items = result.Items || [];
    } else {
      // Fallback to scan for all games (less efficient)
      const params = {
        TableName: TABLE_NAME
      };
      const result = await dynamodb.send(new ScanCommand(params));
      items = result.Items || [];
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        games: items.sort((a, b) => {
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