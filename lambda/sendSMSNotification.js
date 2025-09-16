const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const twilio = require('twilio');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

// Configure Day.js plugins
dayjs.extend(utc);
dayjs.extend(timezone);
const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const ssm = new SSMClient({});

async function getTwilioConfig() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (sid && token && from) {
    return { sid, token, from };
  }

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
// No notifications table; fire-and-forget

exports.handler = async (event) => {
  try {
    // Parse SQS message
    for (const record of event.Records) {
      const message = JSON.parse(record.body);
      await processSMSNotification(message);
    }

    return { statusCode: 200, body: 'SMS notifications processed' };
  } catch (error) {
    console.error('Error processing SMS notifications:', error);
    throw error;
  }
};

async function processSMSNotification(notification) {
  const { userId, type, gameId, groupName, gameDate, gameTime, location, buyin, rsvpToken } = notification;

  try {
    // Get user details
    const userResult = await dynamodb.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { userId }
    }));

    if (!userResult.Item) {
      console.error(`User not found: ${userId}`);
      return;
    }

    const user = userResult.Item;
    
    // Check if user has SMS notifications enabled for this type
    const smsEnabled = user.notificationPreferences?.[type]?.sms;
    if (!smsEnabled || !user.phone) {
      console.log(`SMS not enabled or no phone for user ${userId}, type ${type}`);
      return;
    }

    // Generate message based on type
    let messageText;
    if (type === 'gameInvitations') {
      const userTimezone = user.timezone || 'America/New_York';
      const formattedTime = formatGameTime(gameDate, gameTime, userTimezone);

      // Use tokenized RSVP link for secure, no-login access
      const rsvpLink = rsvpToken
        ? `https://changing500.com/rsvp-token/${rsvpToken}`
        : `https://changing500.com/rsvp`;

      // Build game details
      let gameDetails = `poker night ${formattedTime}`;
      if (location) {
        gameDetails += ` at ${location}`;
      }
      gameDetails += ` in the ${groupName} group`;
      if (buyin && buyin !== 20) {
        gameDetails += ` ($${buyin} buy-in)`;
      }

      // Check if user has multiple pending RSVPs
      const pendingRSVPCount = await countPendingRSVPs(userId);

      if (pendingRSVPCount > 1) {
        // Multiple pending RSVPs - force them to use the link
        messageText = `You're invited to ${gameDetails}. You have multiple pending invitations, please use this link to respond: ${rsvpLink}. Reply STOP to opt-out.`;
      } else {
        // Single pending RSVP - allow SMS reply or link
        messageText = `You're invited to ${gameDetails}. Reply YES or NO, or use link: ${rsvpLink}. Reply STOP to opt-out.`;
      }
    } else if (type === 'gameResults') {
      const userTimezone = user.timezone || 'America/New_York';
      const formattedTime = formatGameTime(gameDate, gameTime, userTimezone);
      messageText = `Poker game results are in for ${formattedTime} at ${location} in the ${groupName} group! Check the app to see how you did. Reply STOP to opt-out.`;
    }

    // Send SMS via Twilio
    await sendSMS(user.phone, messageText);

    console.log(`SMS sent successfully to ${userId} for ${type}`);

  } catch (error) {
    console.error(`Error sending SMS to ${userId}:`, error);
    throw error;
  }
}

 

async function sendSMS(phoneNumber, message) {
  // Ensure phone number is in E.164 format
  const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+1${phoneNumber.replace(/\D/g, '')}`;

  try {
    const { sid, token, from } = await getTwilioConfig();
    const client = twilio(sid, token);
    const result = await client.messages.create({ to: formattedPhone, from, body: message });
    console.log('SMS sent via Twilio:', result.sid);
    return result;
  } catch (error) {
    console.error('Error sending SMS via Twilio:', error);
    throw error;
  }
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

    // Count scheduled games where user has pending RSVP
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