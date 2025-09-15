const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const twilio = require('twilio');
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
  const { userId, type, gameId, groupName, gameDate, gameTime, rsvpToken } = notification;

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
      const formattedTime = formatGameTime(gameDate, gameTime);
      const rsvpLink = `https://api.changing500.com/prod/rsvp/${gameId}?token=${encodeURIComponent(rsvpToken)}`;
      messageText = `You're invited to poker night ${formattedTime} in the ${groupName} group. Reply YES or NO, or use link: ${rsvpLink}`;
    } else if (type === 'gameResults') {
      const formattedTime = formatGameTime(gameDate, gameTime);
      messageText = `Poker game results are in for ${formattedTime} in the ${groupName} group! Check the app to see how you did.`;
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

 

function formatGameTime(gameDate, gameTime) {
  if (!gameDate) return '';
  if (!gameTime) return gameDate; // Just the date as YYYY-MM-DD

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

    return `${gameDate}, ${timeStr}`; // YYYY-MM-DD, XX AM/PM
  } catch (error) {
    return `${gameDate}`;
  }
}