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
      let message = `RSVP updated to ${result.finalStatus}`;
      if (result.waitlistPosition) {
        message = `You've been added to the waitlist (position #${result.waitlistPosition})`;
      }

      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: true,
          message,
          gameId,
          userId,
          rsvpStatus: result.finalStatus,
          waitlistPosition: result.waitlistPosition
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

    // Handle waitlist logic
    const maxPlayers = game.maxPlayers;
    const waitlistEnabled = game.waitlistEnabled;
    const currentResults = [...game.results];
    const currentWaitlist = game.waitlist || [];

    let updatedResults = [...currentResults];
    let updatedWaitlist = [...currentWaitlist];
    let waitlistPosition = null;

    const currentUserResult = updatedResults[userResultIndex];

    if (rsvpStatus === 'yes') {
      // User wants to confirm attendance

      if (maxPlayers) {
        // Count confirmed players (excluding current user)
        const confirmedCount = updatedResults.filter((r, i) =>
          i !== userResultIndex && r.rsvpStatus === 'yes'
        ).length;

        if (confirmedCount >= maxPlayers) {
          if (waitlistEnabled) {
            // Game is at capacity, add to waitlist
            rsvpStatus = 'waitlisted';

            // Remove user from existing waitlist if present
            updatedWaitlist = updatedWaitlist.filter(w => w.userId !== userId);

            // Add to end of waitlist
            const newWaitlistEntry = {
              userId,
              addedAt: new Date().toISOString(),
              position: updatedWaitlist.length + 1
            };
            updatedWaitlist.push(newWaitlistEntry);
            waitlistPosition = newWaitlistEntry.position;

            // Update user result with waitlist info
            updatedResults[userResultIndex] = {
              ...currentUserResult,
              rsvpStatus: 'waitlisted',
              waitlistPosition,
              waitlistAddedAt: newWaitlistEntry.addedAt
            };
          } else {
            // No waitlist enabled, reject the RSVP
            return { success: false, error: `Game is full (${maxPlayers}/${maxPlayers} players). Waitlist is not enabled for this game.` };
          }
        } else {
          // Space available, confirm the user
          updatedResults[userResultIndex] = {
            ...currentUserResult,
            rsvpStatus: 'yes',
            waitlistPosition: null,
            waitlistAddedAt: null
          };

          // Remove from waitlist if they were on it
          updatedWaitlist = updatedWaitlist.filter(w => w.userId !== userId);
        }
      } else {
        // No max players limit, always confirm
        updatedResults[userResultIndex] = {
          ...currentUserResult,
          rsvpStatus: 'yes',
          waitlistPosition: null,
          waitlistAddedAt: null
        };
      }

    } else if (rsvpStatus === 'no') {
      // User declining or withdrawing

      updatedResults[userResultIndex] = {
        ...currentUserResult,
        rsvpStatus: 'no',
        waitlistPosition: null,
        waitlistAddedAt: null
      };

      // Remove from waitlist
      updatedWaitlist = updatedWaitlist.filter(w => w.userId !== userId);

      // If user was confirmed and there's a waitlist and waitlist is enabled, promote next person
      if (waitlistEnabled && currentUserResult.rsvpStatus === 'yes' && updatedWaitlist.length > 0) {
        const nextUser = updatedWaitlist[0];

        // Find the next user in results and promote them
        const nextUserIndex = updatedResults.findIndex(r => r.userId === nextUser.userId);
        if (nextUserIndex !== -1) {
          updatedResults[nextUserIndex] = {
            ...updatedResults[nextUserIndex],
            rsvpStatus: 'yes',
            waitlistPosition: null,
            waitlistAddedAt: null
          };

          // Remove promoted user from waitlist
          updatedWaitlist = updatedWaitlist.slice(1);

          // TODO: Send promotion notification to promoted user
        }
      }

      // Update waitlist positions
      updatedWaitlist = updatedWaitlist.map((entry, index) => ({
        ...entry,
        position: index + 1
      }));

    } else if (rsvpStatus === 'pending') {
      // Reset to pending
      updatedResults[userResultIndex] = {
        ...currentUserResult,
        rsvpStatus: 'pending',
        waitlistPosition: null,
        waitlistAddedAt: null
      };

      // Remove from waitlist
      updatedWaitlist = updatedWaitlist.filter(w => w.userId !== userId);
    }

    // Update the game in DynamoDB
    await dynamodb.send(new UpdateCommand({
      TableName: GAMES_TABLE,
      Key: { id: gameId },
      UpdateExpression: 'SET results = :results, waitlist = :waitlist, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':results': updatedResults,
        ':waitlist': updatedWaitlist,
        ':updatedAt': new Date().toISOString()
      }
    }));

    console.log(`RSVP updated: ${userId} -> ${rsvpStatus} for game ${gameId}${waitlistPosition ? ` (waitlist position: ${waitlistPosition})` : ''}`);

    return {
      success: true,
      waitlistPosition,
      finalStatus: updatedResults[userResultIndex].rsvpStatus
    };

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