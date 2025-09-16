const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const { DynamoDBDocumentClient, GetCommand, UpdateCommand, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const twilio = require('twilio');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

// Configure Day.js plugins
dayjs.extend(utc);
dayjs.extend(timezone);
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

    // Handle STOP command for SMS opt-out
    if (['stop', 'unsubscribe', 'opt-out', 'optout'].includes(reply)) {
      await handleSMSOptOut(user, originationNumber);
      return;
    }

    // Handle HELP command
    if (['help', 'info'].includes(reply)) {
      await sendHelpMessage(originationNumber);
      return;
    }

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

    // Check if user has multiple pending RSVPs
    const pendingRSVPCount = await countPendingRSVPs(user.userId);

    if (pendingRSVPCount > 1) {
      // User has multiple pending RSVPs - redirect them to the link
      await sendMultipleRSVPMessage(originationNumber);
      return;
    }

    // Find the single pending game invitation for this user
    const game = await findSinglePendingGameInvitation(user.userId);
    if (!game) {
      await sendErrorMessage(originationNumber, "No pending game invitation found. Check https://changing500.com/rsvp to see your upcoming games and update your RSVP.");
      return;
    }

    // Update RSVP status
    await updateGameRSVP(game.id, user.userId, rsvpStatus);

    // Send confirmation
    await sendRSVPConfirmation(originationNumber, rsvpStatus, game, user);

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

async function findSinglePendingGameInvitation(userId) {
  try {
    // Query scheduled games via GSI to find the single game this user has a pending RSVP for
    const params = {
      TableName: GAMES_TABLE,
      IndexName: 'status-date-index',
      KeyConditionExpression: '#status = :scheduled',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':scheduled': 'scheduled' },
      ScanIndexForward: true
    };

    const result = await dynamodb.send(new QueryCommand(params));
    const games = result.Items || [];

    console.log(`Found ${games.length} total games for user ${userId}`);

    // Filter for games where user has pending RSVP
    const eligibleGames = games.filter(game =>
      game.results?.some(r => {
        const match = r.userId === userId && r.rsvpStatus === 'pending';
        if (r.userId === userId) {
          console.log(`User ${userId} found in game ${game.id} with RSVP status: ${r.rsvpStatus}`);
        }
        return match;
      })
    );

    console.log(`Found ${eligibleGames.length} eligible games with pending RSVP for user ${userId}`);

    return eligibleGames[0] || null;
  } catch (error) {
    console.error('Error finding pending game invitation:', error);
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

async function sendRSVPConfirmation(phoneNumber, rsvpStatus, game, user) {
  // Use the user's timezone preference for consistent time formatting
  const userTimezone = user?.timezone || 'America/New_York';
  const formattedTime = formatGameTime(game.date, game.time, userTimezone);

  let message;
  if (rsvpStatus === 'yes') {
    message = `Great! You're confirmed for poker night ${formattedTime} at ${game.location}.`;
  } else {
    message = `Got it! You're marked as not attending poker night ${formattedTime} at ${game.location}.`;
  }

  await sendSMS(phoneNumber, message);
}

async function handleSMSOptOut(user, phoneNumber) {
  try {
    // Update user's notification preferences to disable SMS notifications
    const updatedPreferences = {
      ...user.notificationPreferences,
      gameInvitations: {
        ...user.notificationPreferences?.gameInvitations,
        sms: false
      },
      gameResults: {
        ...user.notificationPreferences?.gameResults,
        sms: false
      }
    };

    // Update user record in DynamoDB
    await dynamodb.send(new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { userId: user.userId },
      UpdateExpression: 'SET notificationPreferences = :prefs, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':prefs': updatedPreferences,
        ':updatedAt': new Date().toISOString()
      }
    }));

    // Send confirmation message
    const message = "You have been unsubscribed from SMS notifications from Changing 500. " +
                   "You can re-enable SMS notifications anytime in your profile settings at changing500.com. " +
                   "You will continue to receive email notifications if enabled.";

    await sendSMS(phoneNumber, message);
    console.log(`SMS opt-out processed for user ${user.userId}`);

  } catch (error) {
    console.error('Error processing SMS opt-out:', error);
    const errorMessage = "Sorry, we couldn't process your unsubscribe request right now. " +
                        "Please try again later or visit changing500.com to update your settings.";
    await sendSMS(phoneNumber, errorMessage);
  }
}

async function sendHelpMessage(phoneNumber) {
  const message = "Changing 500 SMS Help:\n" +
                 "• Reply YES to confirm game invitation\n" +
                 "• Reply NO to decline invitation\n" +
                 "• Reply STOP to unsubscribe\n" +
                 "• Visit changing500.com for more options";
  await sendSMS(phoneNumber, message);
}

async function sendErrorMessage(phoneNumber, errorMsg) {
  await sendSMS(phoneNumber, errorMsg);
}

async function sendMultipleRSVPMessage(phoneNumber) {
  const message = "You have multiple pending game invitations. Please visit https://changing500.com/rsvp to respond to each invitation.";
  await sendSMS(phoneNumber, message);
}

async function countPendingRSVPs(userId) {
  try {
    // Query scheduled games via GSI and count those with pending RSVPs for this user
    const params = {
      TableName: GAMES_TABLE,
      IndexName: 'status-date-index',
      KeyConditionExpression: '#status = :scheduled',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':scheduled': 'scheduled' },
      ScanIndexForward: true
    };

    const result = await dynamodb.send(new QueryCommand(params));
    const games = result.Items || [];

    // Count games where user has pending RSVP
    const pendingCount = games
      .filter(game => {
        const userResult = game.results?.find(r => r.userId === userId);
        return userResult && (!userResult.rsvpStatus || userResult.rsvpStatus === 'pending');
      })
      .length;

    return pendingCount;
  } catch (error) {
    console.error('Error counting pending RSVPs:', error);
    return 0; // Default to 0 on error, which allows SMS replies
  }
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

function formatGameTime(gameDate, gameTime, userTimezone = 'America/New_York') {
  if (!gameDate) return '';
  if (!gameTime) return gameDate; // Just the date

  try {
    // Parse the UTC time stored in the database and convert to user's timezone
    const utcDateTime = dayjs.utc(`${gameDate} ${gameTime}`);
    const userDateTime = utcDateTime.tz(userTimezone);

    // Format in a readable way
    return userDateTime.format('ddd, MMM D, h:mm A');
  } catch (error) {
    console.error('Error formatting game time with Day.js:', error);
    return `${gameDate}${gameTime ? ` at ${gameTime}` : ''}`;
  }
}