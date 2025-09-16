const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const crypto = require('crypto');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);
const ssm = new SSMClient({});

const GAMES_TABLE = process.env.GAMES_TABLE_NAME;

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: ''
    };
  }

  try {
    const token = event.pathParameters?.token;
    const body = JSON.parse(event.body || '{}');
    const { rsvpStatus } = body;

    if (!token) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: false,
          error: 'Token is required'
        })
      };
    }

    if (!rsvpStatus || !['yes', 'no', 'pending'].includes(rsvpStatus)) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: false,
          error: 'Valid rsvpStatus (yes, no, pending) is required'
        })
      };
    }

    // Validate and decode the token
    const tokenData = await validateRsvpToken(token);
    if (!tokenData) {
      return {
        statusCode: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: false,
          error: 'Invalid or expired token'
        })
      };
    }

    const { userId, gameId } = tokenData;

    // Update the RSVP status
    const result = await updateGameRSVP(gameId, userId, rsvpStatus);

    if (result.success) {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: true,
          message: `RSVP updated to ${rsvpStatus}`,
          gameId,
          userId,
          rsvpStatus
        })
      };
    } else {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: false,
          error: result.error
        })
      };
    }

  } catch (error) {
    console.error('Error updating RSVP with token:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error'
      })
    };
  }
};

async function validateRsvpToken(token) {
  try {
    // Split the JWT-like token
    const [headerB64, payloadB64, signatureB64] = token.split('.');
    if (!headerB64 || !payloadB64 || !signatureB64) {
      return null;
    }

    // Decode header and payload
    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString());
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());

    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      console.log('Token expired:', payload.exp, 'vs', now);
      return null;
    }

    // Check scope
    if (payload.scope !== 'rsvp') {
      console.log('Invalid token scope:', payload.scope);
      return null;
    }

    // Verify signature
    const secret = await getJwtSecret();
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');

    if (signatureB64 !== expectedSignature) {
      console.log('Invalid token signature');
      return null;
    }

    return payload;
  } catch (error) {
    console.error('Error validating token:', error);
    return null;
  }
}

async function updateGameRSVP(gameId, userId, rsvpStatus) {
  try {
    // Get the game first to verify it exists and user is invited
    const gameResult = await dynamodb.send(new GetCommand({
      TableName: GAMES_TABLE,
      Key: { id: gameId }
    }));

    if (!gameResult.Item) {
      return { success: false, error: 'Game not found' };
    }

    const game = gameResult.Item;

    // Check if user is invited to this game
    const userResultIndex = game.results?.findIndex(r => r.userId === userId);
    if (userResultIndex === -1) {
      return { success: false, error: 'User not invited to this game' };
    }

    // Check if game is scheduled (can only RSVP to scheduled games)
    if (game.status !== 'scheduled') {
      return { success: false, error: 'Can only RSVP to scheduled games' };
    }

    // Update the user's RSVP status in the results array
    const updatedResults = [...game.results];
    updatedResults[userResultIndex] = {
      ...updatedResults[userResultIndex],
      rsvpStatus
    };

    // Update the game in DynamoDB
    await dynamodb.send(new UpdateCommand({
      TableName: GAMES_TABLE,
      Key: { id: gameId },
      UpdateExpression: 'SET results = :results, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':results': updatedResults,
        ':updatedAt': new Date().toISOString()
      }
    }));

    console.log(`RSVP updated: ${userId} -> ${rsvpStatus} for game ${gameId}`);
    return { success: true };

  } catch (error) {
    console.error('Error updating RSVP:', error);
    return { success: false, error: 'Failed to update RSVP' };
  }
}

async function getJwtSecret() {
  const resp = await ssm.send(new GetParameterCommand({
    Name: '/changing-500/jwt-secret',
    WithDecryption: true
  }));
  return resp.Parameter.Value;
}