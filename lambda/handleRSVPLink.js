const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { verifyAuthHeader, verifyJWT } = require('./verifyJWT');
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);
const ssm = new SSMClient({});

const GAMES_TABLE = process.env.GAMES_TABLE_NAME;

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': event.headers?.origin || '*',
    'Access-Control-Allow-Methods': 'PUT, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'false'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const gameId = event.pathParameters?.gameId;
    
    if (event.httpMethod === 'GET') {
      // GET can serve two purposes:
      // 1) If only token is provided, return JSON with game + invitee info
      // 2) If token and status=yes|no provided, perform RSVP update and redirect to a friendly page
      const token = event.queryStringParameters?.token;
      const status = event.queryStringParameters?.status?.toLowerCase();
      if (token && (status === 'yes' || status === 'no')) {
        const updateResp = await handleUpdateRSVP({
          ...event,
          body: JSON.stringify({ rsvpStatus: status, token })
        }, gameId, headers);

        // If update succeeded, redirect to a confirmation page
        if (updateResp.statusCode === 200) {
          return {
            statusCode: 302,
            headers: {
              ...headers,
              Location: `https://changing500.com/rsvp-confirmation?status=${status}`
            },
            body: ''
          };
        }
        return updateResp;
      }

      return await handleGetRSVP(gameId, token, headers);
    } 
    
    if (event.httpMethod === 'PUT') {
      // Update RSVP status. Allow either auth header OR RSVP token for unauthenticated flows
      return await handleUpdateRSVP(event, gameId, headers);
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Error handling RSVP:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

async function handleGetRSVP(gameId, token, headers) {
  if (!gameId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Game ID is required' })
    };
  }

  // Get game details
  const gameResult = await dynamodb.send(new GetCommand({
    TableName: GAMES_TABLE,
    Key: { id: gameId }
  }));

  if (!gameResult.Item) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Game not found' })
    };
  }

  const game = gameResult.Item;

  // Only allow RSVP for scheduled games
  if (game.status !== 'scheduled') {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        error: 'RSVP is only available for scheduled games',
        game: {
          id: game.id,
          date: game.date,
          time: game.time,
          status: game.status
        }
      })
    };
  }

  let invitee = null;
  if (token) {
    const verification = await verifyRsvpToken(token);
    if (verification.valid && verification.payload.gameId === game.id) {
      invitee = { userId: verification.payload.userId };
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      game: {
        id: game.id,
        date: game.date,
        time: game.time,
        status: game.status,
        groupId: game.groupId
      },
      invitee
    })
  };
}

async function handleUpdateRSVP(event, gameId, headers) {
  const body = JSON.parse(event.body || '{}');
  const token = event.queryStringParameters?.token || body.token;

  // Try RSVP token first
  let userId = null;
  if (token) {
    const verification = await verifyRsvpToken(token);
    if (verification.valid) {
      userId = verification.payload.userId;
    }
  }

  // Fallback to auth header
  if (!userId) {
    const authResult = await verifyAuthHeader(event.headers?.Authorization || event.headers?.authorization);
    if (!authResult.valid) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }
    userId = authResult.payload?.userId;
  }
  if (!userId) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Invalid token' })
    };
  }

  const { rsvpStatus } = JSON.parse(event.body || '{}');
  
  if (!rsvpStatus || !['yes', 'no', 'pending'].includes(rsvpStatus)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Valid rsvpStatus (yes/no/pending) is required' })
    };
  }

  // Get game
  const gameResult = await dynamodb.send(new GetCommand({
    TableName: GAMES_TABLE,
    Key: { id: gameId }
  }));

  if (!gameResult.Item) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Game not found' })
    };
  }

  const game = gameResult.Item;

  // Only allow RSVP for scheduled games
  if (game.status !== 'scheduled') {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'RSVP is only available for scheduled games' })
    };
  }

  // Check if user is invited to this game
  const userResult = game.results?.find(r => r.userId === userId);
  if (!userResult) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'You are not invited to this game' })
    };
  }

  // Update RSVP status
  const updatedResults = game.results.map(result => {
    if (result.userId === userId) {
      return { ...result, rsvpStatus };
    }
    return result;
  });

  await dynamodb.send(new UpdateCommand({
    TableName: GAMES_TABLE,
    Key: { id: gameId },
    UpdateExpression: 'SET results = :results, updatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':results': updatedResults,
      ':updatedAt': new Date().toISOString()
    }
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: 'RSVP updated successfully',
      rsvpStatus,
      gameId
    })
  };
}

async function verifyRsvpToken(token) {
  try {
    // Get JWT secret from Parameter Store
    const getParameterCommand = new GetParameterCommand({
      Name: '/changing-500/jwt-secret',
      WithDecryption: true
    });
    const parameterResponse = await ssm.send(getParameterCommand);
    const jwtSecret = parameterResponse.Parameter.Value;

    const verification = verifyJWT(token, jwtSecret);
    if (!verification.valid) {
      return { valid: false };
    }
    const payload = verification.payload || {};
    if (payload.scope !== 'rsvp') {
      return { valid: false };
    }
    return { valid: true, payload };
  } catch (error) {
    console.error('Error verifying RSVP token:', error);
    return { valid: false };
  }
}