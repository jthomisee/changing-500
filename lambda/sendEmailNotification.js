const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');

const ses = new SESClient({});
const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const USERS_TABLE = process.env.USERS_TABLE_NAME;
const RSVP_BASE_URL = process.env.RSVP_BASE_URL;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@changing500.com';

exports.handler = async (event) => {
  console.log('Processing email notifications:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    try {
      const notification = JSON.parse(record.body);
      console.log('Processing notification:', notification);

      // Get user details for additional context
      const user = await getUser(notification.userId);
      if (!user) {
        console.error(`User ${notification.userId} not found`);
        continue;
      }

      // Get user's timezone preference for date formatting
      const userTimezone = user.timezone || 'America/New_York';

      if (notification.type === 'gameInvitations') {
        await sendGameInvitationEmail(notification, user, userTimezone);
      } else if (notification.type === 'gameResults') {
        await sendGameResultsEmail(notification, user, userTimezone);
      } else {
        console.error('Unknown notification type:', notification.type);
      }

    } catch (error) {
      console.error('Error processing email notification:', error);
      // Don't throw - let other notifications in the batch process
    }
  }

  return { statusCode: 200, body: 'Email notifications processed' };
};

async function sendGameInvitationEmail(notification, user, userTimezone) {
  const { gameId, groupName, gameDate, gameTime, location, buyin, rsvpToken } = notification;

  // Format the game date/time in user's timezone
  const gameDateTime = formatGameDateTime(gameDate, gameTime, userTimezone);

  // Build RSVP links
  const rsvpYesUrl = `${RSVP_BASE_URL}/${gameId}/${user.userId}?token=${rsvpToken}&rsvp=yes`;
  const rsvpNoUrl = `${RSVP_BASE_URL}/${gameId}/${user.userId}?token=${rsvpToken}&rsvp=no`;
  const rsvpPageUrl = `${RSVP_BASE_URL}/${gameId}/${user.userId}?token=${rsvpToken}`;

  const subject = `🎰 Game Invitation: ${groupName} - ${gameDateTime}`;

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Game Invitation</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #ddd; border-top: none; }
        .game-details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .game-details h3 { margin-top: 0; color: #495057; }
        .detail-item { margin: 8px 0; }
        .detail-label { font-weight: bold; color: #6c757d; }
        .rsvp-buttons { text-align: center; margin: 30px 0; }
        .rsvp-button { display: inline-block; padding: 12px 30px; margin: 0 10px; text-decoration: none; border-radius: 6px; font-weight: bold; }
        .rsvp-yes { background: #28a745; color: white; }
        .rsvp-no { background: #dc3545; color: white; }
        .rsvp-page { background: #007bff; color: white; }
        .footer { text-align: center; padding: 20px; color: #6c757d; font-size: 14px; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎰 Game Invitation</h1>
        <p>You're invited to play poker!</p>
      </div>

      <div class="content">
        <p>Hi ${user.firstName},</p>

        <p>You've been invited to a poker game with <strong>${groupName}</strong>!</p>

        <div class="game-details">
          <h3>📅 Game Details</h3>
          <div class="detail-item">
            <span class="detail-label">Date & Time:</span> ${gameDateTime}
          </div>
          ${location ? `<div class="detail-item"><span class="detail-label">Location:</span> ${location}</div>` : ''}
          ${buyin ? `<div class="detail-item"><span class="detail-label">Buy-in:</span> $${buyin}</div>` : ''}
        </div>

        <div class="rsvp-buttons">
          <a href="${rsvpYesUrl}" class="rsvp-button rsvp-yes">✅ I'm In!</a>
          <a href="${rsvpNoUrl}" class="rsvp-button rsvp-no">❌ Can't Make It</a>
        </div>

        <p style="text-align: center;">
          <a href="${rsvpPageUrl}" class="rsvp-button rsvp-page">View Full Details</a>
        </p>

        <p>Please RSVP as soon as possible so we can plan accordingly!</p>

        <p>Looking forward to seeing you at the table! 🃏</p>
      </div>

      <div class="footer">
        <p>This invitation was sent by ${groupName}</p>
        <p>If you have any questions, please contact your game organizer.</p>
      </div>
    </body>
    </html>
  `;

  const textBody = `
🎰 Game Invitation: ${groupName}

Hi ${user.firstName},

You've been invited to a poker game!

Game Details:
- Date & Time: ${gameDateTime}
${location ? `- Location: ${location}\n` : ''}${buyin ? `- Buy-in: $${buyin}\n` : ''}

RSVP Options:
- I'm In: ${rsvpYesUrl}
- Can't Make It: ${rsvpNoUrl}
- View Details: ${rsvpPageUrl}

Please RSVP as soon as possible!

Looking forward to seeing you at the table! 🃏
  `;

  await sendEmail(user.email, subject, htmlBody, textBody);
}

async function sendGameResultsEmail(notification, user, userTimezone) {
  const { gameId, groupName, gameDate, gameTime } = notification;

  // Format the game date/time in user's timezone
  const gameDateTime = formatGameDateTime(gameDate, gameTime, userTimezone);

  const subject = `🏆 Game Results: ${groupName} - ${gameDateTime}`;

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Game Results</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #ddd; border-top: none; }
        .game-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
        .footer { text-align: center; padding: 20px; color: #6c757d; font-size: 14px; border-top: 1px solid #eee; }
        .cta-button { display: inline-block; padding: 12px 30px; margin: 20px 0; background: #007bff; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🏆 Game Results</h1>
        <p>The game results are in!</p>
      </div>

      <div class="content">
        <p>Hi ${user.firstName},</p>

        <p>The results for your recent poker game with <strong>${groupName}</strong> are now available!</p>

        <div class="game-info">
          <h3>📅 Game Information</h3>
          <p><strong>Date & Time:</strong> ${gameDateTime}</p>
        </div>

        <p style="text-align: center;">
          <a href="https://changing500.com/games" class="cta-button">View Results & Standings</a>
        </p>

        <p>Check out how you did and see the updated leaderboard!</p>

        <p>Thanks for playing! 🃏</p>
      </div>

      <div class="footer">
        <p>Results posted by ${groupName}</p>
        <p>Login to see detailed statistics and standings.</p>
      </div>
    </body>
    </html>
  `;

  const textBody = `
🏆 Game Results: ${groupName}

Hi ${user.firstName},

The results for your recent poker game are now available!

Game Information:
- Date & Time: ${gameDateTime}

View your results and updated standings at:
https://changing500.com/games

Thanks for playing! 🃏
  `;

  await sendEmail(user.email, subject, htmlBody, textBody);
}

async function sendEmail(toEmail, subject, htmlBody, textBody) {
  const params = {
    Source: FROM_EMAIL,
    Destination: {
      ToAddresses: [toEmail]
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8'
      },
      Body: {
        Html: {
          Data: htmlBody,
          Charset: 'UTF-8'
        },
        Text: {
          Data: textBody,
          Charset: 'UTF-8'
        }
      }
    }
  };

  try {
    const result = await ses.send(new SendEmailCommand(params));
    console.log('Email sent successfully:', result.MessageId);
    return result;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

function formatGameDateTime(gameDate, gameTime, userTimezone) {
  if (!gameDate) return 'TBD';

  try {
    if (gameTime) {
      // Create UTC datetime and format in user's timezone
      const utcDateTime = new Date(`${gameDate}T${gameTime}:00.000Z`);
      const options = {
        timeZone: userTimezone,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      };
      return new Intl.DateTimeFormat('en-US', options).format(utcDateTime);
    }

    // Just date without time
    const date = new Date(gameDate);
    const options = {
      timeZone: userTimezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return new Intl.DateTimeFormat('en-US', options).format(date);
  } catch (error) {
    console.error('Error formatting game date/time:', error);
    return `${gameDate}${gameTime ? ` at ${gameTime}` : ''}`;
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