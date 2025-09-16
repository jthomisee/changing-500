const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const crypto = require('crypto');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);
const ssm = new SSMClient({});

const USERS_TABLE = process.env.USERS_TABLE_NAME;
const GAMES_TABLE = process.env.GAMES_TABLE_NAME;
const GROUPS_TABLE = process.env.GROUPS_TABLE_NAME;

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

    // Get game details
    const game = await getGame(gameId);
    if (!game) {
      return {
        statusCode: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: false,
          error: 'Game not found'
        })
      };
    }

    // Get user details
    const user = await getUser(userId);
    if (!user) {
      return {
        statusCode: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: false,
          error: 'User not found'
        })
      };
    }

    // Verify user is invited to this game
    const userResult = game.results?.find(r => r.userId === userId);
    if (!userResult) {
      return {
        statusCode: 403,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: false,
          error: 'User not invited to this game'
        })
      };
    }

    // Get group details for context
    const group = await getGroup(game.groupId);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        game: {
          ...game,
          groupName: group?.name || 'Unknown Group'
        },
        user: {
          userId: user.userId,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email
        },
        tokenData: {
          scope: tokenData.scope,
          exp: tokenData.exp
        }
      })
    };

  } catch (error) {
    console.error('Error processing RSVP token:', error);
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

async function getJwtSecret() {
  const resp = await ssm.send(new GetParameterCommand({
    Name: '/changing-500/jwt-secret',
    WithDecryption: true
  }));
  return resp.Parameter.Value;
}

async function getGame(gameId) {
  try {
    const result = await dynamodb.send(new GetCommand({
      TableName: GAMES_TABLE,
      Key: { id: gameId }
    }));
    return result.Item;
  } catch (error) {
    console.error('Error getting game:', error);
    return null;
  }
}

async function getUser(userId) {
  try {
    const result = await dynamodb.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { userId }
    }));
    return result.Item;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

async function getGroup(groupId) {
  try {
    const result = await dynamodb.send(new GetCommand({
      TableName: GROUPS_TABLE,
      Key: { groupId }
    }));
    return result.Item;
  } catch (error) {
    console.error('Error getting group:', error);
    return null;
  }
}