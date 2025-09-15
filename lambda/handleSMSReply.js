const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const { DynamoDBDocumentClient, GetCommand, UpdateCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const twilio = require('twilio');
const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const TWILIO_VALIDATE_SIGNATURE = (process.env.TWILIO_VALIDATE_SIGNATURE || 'false').toLowerCase() === 'true';
const ssm = new SSMClient({});

async function getTwilioConfig() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (sid && token && from) {
    return { sid, token, from };
  }

  // Fallback to SSM Parameter Store
  const [sidParam, tokenParam, fromParam] = await Promise.all([
    ssm.send(new GetParameterCommand({ Name: '/changing-500/twilio/account_sid', WithDecryption: true })),
    ssm.send(new GetParameterCommand({ Name: '/changing-500/twilio/auth_token', WithDecryption: true })),
    ssm.send(new GetParameterCommand({ Name: '/changing-500/twilio/from_number' }))
  ]);

  return {
    sid: sid || sidParam.Parameter?.Value,
    token: token || tokenParam.Parameter?.Value,
    from: from || fromParam.Parameter?.Value
  };
}
const USERS_TABLE = process.env.USERS_TABLE_NAME;
const GAMES_TABLE = process.env.GAMES_TABLE_NAME;

exports.handler = async (event) => {
  try {
    // Twilio webhook via API Gateway proxy
    if (event.httpMethod === 'POST') {
      const rawBody = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : (event.body || '');
      const params = new URLSearchParams(rawBody);
      const from = params.get('From') || '';
      const body = params.get('Body') || '';

      // Optional: validate X-Twilio-Signature header
      if (TWILIO_VALIDATE_SIGNATURE) {
        const { token } = await getTwilioConfig();
        const signature = event.headers['X-Twilio-Signature'] || event.headers['x-twilio-signature'];
        const url = `https://${event.requestContext.domainName}${event.requestContext.path}`;
        const isValid = twilio.validateRequest(token, signature, url, Object.fromEntries(params));
        if (!isValid) {
          return { statusCode: 403, body: 'Invalid signature' };
        }
      }

      const { from: fromNumber } = await getTwilioConfig();
      await processSMSReply({ originationNumber: from, messageBody: body, destinationNumber: fromNumber });

      // Twilio expects a 200 with optional TwiML; empty 200 is fine
      return { statusCode: 200, headers: { 'Content-Type': 'text/plain' }, body: '' };
    }

    return { statusCode: 200 };
  } catch (error) {
    console.error('Error processing SMS reply:', error);
    return { statusCode: 500 };
  }
};

// Connect path removed in favor of Twilio webhook

async function processSMSReply(message) {
  const { originationNumber, messageBody, destinationNumber } = message;

  try {
    // Find user by phone number
    const user = await findUserByPhone(originationNumber);
    if (!user) {
      console.log(`User not found for phone: ${originationNumber}`);
      return;
    }

    // Parse the reply
    const reply = messageBody.trim().toLowerCase();
    let rsvpStatus = null;
    
    if (['yes', 'y', 'confirm', 'confirmed'].includes(reply)) {
      rsvpStatus = 'yes';
    } else if (['no', 'n', 'decline', 'declined'].includes(reply)) {
      rsvpStatus = 'no';
    } else {
      // Send help message for unrecognized replies
      await sendHelpMessage(originationNumber);
      return;
    }

    // Find the most recent game invitation for this user
    const game = await findRecentGameInvitation(user.userId);
    if (!game) {
      await sendErrorMessage(originationNumber, "No recent game invitation found.");
      return;
    }

    // Update RSVP status
    await updateGameRSVP(game.id, user.userId, rsvpStatus);

    // Send confirmation
    await sendRSVPConfirmation(originationNumber, rsvpStatus, game);

    console.log(`RSVP updated: ${user.userId} -> ${rsvpStatus} for game ${game.id}`);

  } catch (error) {
    console.error('Error processing SMS reply:', error);
    await sendErrorMessage(originationNumber, "Sorry, there was an error processing your reply.");
  }
}

async function findUserByPhone(phoneNumber) {
  // Normalize phone number for search
  const normalizedPhone = phoneNumber.replace(/\D/g, '');
  
  try {
    // Query users by phone number (assuming phone-index exists)
    const params = {
      TableName: USERS_TABLE,
      IndexName: 'phone-index',
      KeyConditionExpression: 'phone = :phone',
      ExpressionAttributeValues: {
        ':phone': phoneNumber
      }
    };

    const result = await dynamodb.send(new QueryCommand(params));
    return result.Items?.[0] || null;
  } catch (error) {
    console.error('Error finding user by phone:', error);
    return null;
  }
}

async function findRecentGameInvitation(userId) {
  try {
    // Get all games and find the most recent scheduled game this user is invited to
    const params = {
      TableName: GAMES_TABLE
    };

    const result = await dynamodb.send(new QueryCommand(params));
    const games = result.Items || [];

    // Filter for scheduled games where user is invited
    const eligibleGames = games
      .filter(game => game.status === 'scheduled')
      .filter(game => game.results?.some(r => r.userId === userId))
      .sort((a, b) => {
        const aDateTime = new Date(`${a.date}T${a.time || '00:00'}:00.000Z`);
        const bDateTime = new Date(`${b.date}T${b.time || '00:00'}:00.000Z`);
        return bDateTime - aDateTime; // Most recent first
      });

    return eligibleGames[0] || null;
  } catch (error) {
    console.error('Error finding recent game invitation:', error);
    return null;
  }
}

async function updateGameRSVP(gameId, userId, rsvpStatus) {
  try {
    // Get the game
    const gameResult = await dynamodb.send(new GetCommand({
      TableName: GAMES_TABLE,
      Key: { id: gameId }
    }));

    if (!gameResult.Item) {
      throw new Error('Game not found');
    }

    const game = gameResult.Item;
    
    // Update the user's RSVP status in the results array
    const updatedResults = game.results.map(result => {
      if (result.userId === userId) {
        return { ...result, rsvpStatus };
      }
      return result;
    });

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

  } catch (error) {
    console.error('Error updating RSVP:', error);
    throw error;
  }
}

async function sendRSVPConfirmation(phoneNumber, rsvpStatus, game) {
  const formattedTime = formatGameTime(game.date, game.time);
  
  let message;
  if (rsvpStatus === 'yes') {
    message = `Great! You're confirmed for poker night ${formattedTime}.`;
  } else {
    message = `Got it! You're marked as not attending poker night ${formattedTime}.`;
  }

  await sendSMS(phoneNumber, message);
}

async function sendHelpMessage(phoneNumber) {
  const message = "Reply YES to confirm or NO to decline your poker game invitation.";
  await sendSMS(phoneNumber, message);
}

async function sendErrorMessage(phoneNumber, errorMsg) {
  await sendSMS(phoneNumber, errorMsg);
}

async function sendSMS(phoneNumber, message) {
  const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+1${phoneNumber.replace(/\D/g, '')}`;

  try {
    const { sid, token, from } = await getTwilioConfig();
    const client = twilio(sid, token);
    const result = await client.messages.create({
      to: formattedPhone,
      from,
      body: message
    });
    console.log('SMS sent via Twilio:', result.sid);
    return result;
  } catch (error) {
    console.error('Error sending SMS via Twilio:', error);
    throw error;
  }
}

function formatGameTime(gameDate, gameTime) {
  if (!gameDate) return '';
  if (!gameTime) return gameDate;

  try {
    const [hourPart, minutePart = '00'] = String(gameTime).split(':');
    let hour24 = parseInt(hourPart, 10);
    let minutes = parseInt(minutePart, 10) || 0;

    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    let hour12 = hour24 % 12;
    if (hour12 === 0) hour12 = 12;

    const timeStr = minutes > 0
      ? `${hour12}:${String(minutes).padStart(2, '0')} ${ampm}`
      : `${hour12} ${ampm}`;

    return `${gameDate}, ${timeStr}`;
  } catch (error) {
    return `${gameDate}`;
  }
}