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
    const { limit = '10', lastEvaluatedKey } = qs;
    const requestedLimit = parseInt(limit);
    let items = [];
    let lastKey = null;

    // Add pagination support
    const paginationParams = {
      Limit: requestedLimit
    };

    if (lastEvaluatedKey) {
      try {
        paginationParams.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastEvaluatedKey));
      } catch (error) {
        console.error('Invalid lastEvaluatedKey:', error);
      }
    }

    if (qs.groupId) {
      // Query games by groupId via groupId-index
      // Handle pagination to get ALL games for the group
      let continueQuery = true;
      let queryLastKey = paginationParams.ExclusiveStartKey || null;

      while (continueQuery) {
        const params = {
          TableName: TABLE_NAME,
          IndexName: 'groupId-index',
          KeyConditionExpression: 'groupId = :groupId',
          ExpressionAttributeValues: { ':groupId': qs.groupId }
        };

        if (queryLastKey) {
          params.ExclusiveStartKey = queryLastKey;
        }

        const result = await dynamodb.send(new QueryCommand(params));
        items.push(...(result.Items || []));
        queryLastKey = result.LastEvaluatedKey;

        // Continue if there are more items and we haven't reached requested limit
        continueQuery = queryLastKey && items.length < requestedLimit;
      }

      // Set lastKey for client pagination
      lastKey = queryLastKey;
    } else if ((qs.status || '').toLowerCase() === 'scheduled') {
      // Query scheduled games via status-date-index
      const params = {
        TableName: TABLE_NAME,
        IndexName: 'status-date-index',
        KeyConditionExpression: '#status = :scheduled',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':scheduled': 'scheduled' },
        ScanIndexForward: true,
        ...paginationParams
      };
      const result = await dynamodb.send(new QueryCommand(params));
      items = result.Items || [];
      lastKey = result.LastEvaluatedKey;
    } else {
      // Fallback to scan for all games (less efficient)
      // Handle pagination to get ALL games
      let continueScan = true;
      let scanLastKey = paginationParams.ExclusiveStartKey || null;

      while (continueScan) {
        const params = {
          TableName: TABLE_NAME
        };

        if (scanLastKey) {
          params.ExclusiveStartKey = scanLastKey;
        }

        const result = await dynamodb.send(new ScanCommand(params));
        items.push(...(result.Items || []));
        scanLastKey = result.LastEvaluatedKey;

        console.log(`Scanned ${result.Items?.length || 0} games, total so far: ${items.length}, hasMore: ${!!scanLastKey}`);

        // Continue if there are more items and we haven't reached requested limit
        continueScan = scanLastKey && items.length < requestedLimit;
      }

      // Set lastKey for client pagination
      lastKey = scanLastKey;
    }

    console.log(`Total games fetched: ${items.length}, returning to client`);
    
    // Sort games by date and game number
    const sortedGames = items.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      return dateCompare !== 0 ? dateCompare : a.gameNumber - b.gameNumber;
    });

    const response = {
      games: sortedGames,
      count: sortedGames.length
    };

    // Add pagination info if there are more results
    if (lastKey) {
      response.lastEvaluatedKey = encodeURIComponent(JSON.stringify(lastKey));
      response.hasMore = true;
    } else {
      response.hasMore = false;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
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