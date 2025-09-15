const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const crypto = require('crypto');

const sqs = new SQSClient({});
const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);
const ssm = new SSMClient({});

const SMS_QUEUE_URL = process.env.SMS_QUEUE_URL;
const EMAIL_QUEUE_URL = process.env.EMAIL_QUEUE_URL;
const USERS_TABLE = process.env.USERS_TABLE_NAME;
const GAMES_TABLE = process.env.GAMES_TABLE_NAME;
const GROUPS_TABLE = process.env.GROUPS_TABLE_NAME;

exports.handler = async (event) => {
  try {
    const { gameId, notificationType, triggeredBy } = JSON.parse(event.body || '{}');

    if (!gameId || !notificationType) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'gameId and notificationType are required' })
      };
    }

    // Get game details
    const game = await getGame(gameId);
    if (!game) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Game not found' })
      };
    }

    // Get group details
    const group = await getGroup(game.groupId);
    if (!group) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Group not found' })
      };
    }

    // Queue notifications based on type
    let notificationCount = 0;
    
    if (notificationType === 'gameInvitations') {
      notificationCount = await queueGameInvitationNotifications(game, group);
    } else if (notificationType === 'gameResults') {
      notificationCount = await queueGameResultsNotifications(game, group);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: `Queued ${notificationCount} notifications`,
        gameId,
        notificationType
      })
    };

  } catch (error) {
    console.error('Error queuing notifications:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

async function queueGameInvitationNotifications(game, group) {
  let count = 0;

  // Only send invitations for scheduled games
  if (game.status !== 'scheduled') {
    console.log('Game is not scheduled, skipping invitations');
    return count;
  }

  // Get all users invited to this game
  const userIds = game.results?.map(r => r.userId) || [];
  
  for (const userId of userIds) {
    const user = await getUser(userId);
    if (!user) continue;

    // Check if user wants game invitation notifications
    const preferences = user.notificationPreferences?.gameInvitations;
    if (!preferences) continue;

    // Generate signed RSVP token (JWT-like)
    const rsvpToken = await createRsvpToken({ userId, gameId: game.id });

    // Queue SMS notification
    if (preferences.sms && user.phone) {
      await queueSMSNotification({
        userId,
        type: 'gameInvitations',
        gameId: game.id,
        groupName: group.name,
        gameDate: game.date,
        gameTime: game.time,
        rsvpToken
      });
      count++;
    }

    // Queue email notification
    if (preferences.email && user.email) {
      await queueEmailNotification({
        userId,
        type: 'gameInvitations',
        gameId: game.id,
        groupName: group.name,
        gameDate: game.date,
        gameTime: game.time,
        rsvpToken,
        userEmail: user.email,
        userName: `${user.firstName} ${user.lastName}`
      });
      count++;
    }
  }

  return count;
}

async function queueGameResultsNotifications(game, group) {
  let count = 0;

  // Only send results for completed games
  if (game.status !== 'completed') {
    console.log('Game is not completed, skipping results notifications');
    return count;
  }

  // Get all users who participated in this game
  const userIds = game.results?.map(r => r.userId) || [];
  
  for (const userId of userIds) {
    const user = await getUser(userId);
    if (!user) continue;

    // Check if user wants game results notifications
    const preferences = user.notificationPreferences?.gameResults;
    if (!preferences) continue;

    // Queue SMS notification
    if (preferences.sms && user.phone) {
      await queueSMSNotification({
        userId,
        type: 'gameResults',
        gameId: game.id,
        groupName: group.name,
        gameDate: game.date,
        gameTime: game.time
      });
      count++;
    }

    // Queue email notification
    if (preferences.email && user.email) {
      await queueEmailNotification({
        userId,
        type: 'gameResults',
        gameId: game.id,
        groupName: group.name,
        gameDate: game.date,
        gameTime: game.time,
        userEmail: user.email,
        userName: `${user.firstName} ${user.lastName}`
      });
      count++;
    }
  }

  return count;
}

async function queueSMSNotification(notification) {
  await sqs.send(new SendMessageCommand({
    QueueUrl: SMS_QUEUE_URL,
    MessageBody: JSON.stringify(notification),
    MessageAttributes: {
      notificationType: {
        DataType: 'String',
        StringValue: notification.type
      },
      userId: {
        DataType: 'String', 
        StringValue: notification.userId
      }
    }
  }));
}

async function queueEmailNotification(notification) {
  await sqs.send(new SendMessageCommand({
    QueueUrl: EMAIL_QUEUE_URL,
    MessageBody: JSON.stringify(notification),
    MessageAttributes: {
      notificationType: {
        DataType: 'String',
        StringValue: notification.type
      },
      userId: {
        DataType: 'String',
        StringValue: notification.userId
      }
    }
  }));
}

async function getJwtSecret() {
  const resp = await ssm.send(new GetParameterCommand({
    Name: '/changing-500/jwt-secret',
    WithDecryption: true
  }));
  return resp.Parameter.Value;
}

async function createRsvpToken({ userId, gameId, ttlSeconds = 60 * 60 * 24 * 14 }) {
  const secret = await getJwtSecret();
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    scope: 'rsvp',
    userId,
    gameId,
    iat: now,
    exp: now + ttlSeconds
  };

  const base64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const encodedHeader = base64url(header);
  const encodedPayload = base64url(payload);
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
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