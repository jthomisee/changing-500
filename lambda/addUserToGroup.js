const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { verifyAuthHeader } = require('./verifyJWT');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const USERS_TABLE = process.env.USERS_TABLE_NAME;
const USER_GROUPS_TABLE = process.env.USER_GROUPS_TABLE_NAME;

exports.handler = async (event) => {
  // CORS headers for all responses
  const headers = {
    'Access-Control-Allow-Origin': event.headers?.origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'false'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Verify authentication
    const authResult = await verifyAuthHeader(event.headers?.Authorization || event.headers?.authorization);
    if (!authResult.valid || !authResult.payload?.userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authentication required' })
      };
    }

    const { firstName, lastName, email, phone, groupId } = JSON.parse(event.body || '{}');
    
    // Validate required fields
    if (!firstName && !lastName) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'At least first name or last name is required'
        })
      };
    }

    if (!groupId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Group ID is required'
        })
      };
    }

    // Enforce contact requirement
    if (!email && !phone) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Either email or phone number is required'
        })
      };
    }

    const requestingUserId = authResult.payload.userId;
    const isAdmin = authResult.payload.isAdmin || false;

    // Check if user has permission to create users for this group (admins and group owners only)
    if (!isAdmin) {
      // Check if user is a group owner
      const membershipResult = await dynamodb.send(new GetCommand({
        TableName: USER_GROUPS_TABLE,
        Key: { userId: requestingUserId, groupId }
      }));

      if (!membershipResult.Item || membershipResult.Item.role !== 'owner') {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Only admins and group owners can create users' })
        };
      }
    }

    // Smart user detection and creation flow
    let user = null;
    let isExistingUser = false;
    let isFullAccount = false;

    // Step 1: Search for existing user by email or phone if provided
    if (email || phone) {
      if (email) {
        const emailQuery = {
          TableName: USERS_TABLE,
          IndexName: 'email-index',
          KeyConditionExpression: 'email = :email',
          ExpressionAttributeValues: {
            ':email': email.toLowerCase()
          }
        };
        const emailResult = await dynamodb.send(new QueryCommand(emailQuery));
        if (emailResult.Items.length > 0) {
          user = emailResult.Items[0];
          isExistingUser = true;
        }
      }

      if (!user && phone) {
        const normalizedPhone = phone.replace(/\D/g, '');
        const phoneQuery = {
          TableName: USERS_TABLE,
          IndexName: 'phone-index',
          KeyConditionExpression: 'phone = :phone',
          ExpressionAttributeValues: {
            ':phone': normalizedPhone
          }
        };
        const phoneResult = await dynamodb.send(new QueryCommand(phoneQuery));
        if (phoneResult.Items.length > 0) {
          user = phoneResult.Items[0];
          isExistingUser = true;
        }
      }
    }

    // Step 2: If user found, add them to the group (if not already a member)
    if (isExistingUser) {
      const existingMembership = await dynamodb.send(new GetCommand({
        TableName: USER_GROUPS_TABLE,
        Key: { userId: user.userId, groupId }
      }));

      if (!existingMembership.Item) {
        const membershipParams = {
          TableName: USER_GROUPS_TABLE,
          Item: {
            userId: user.userId,
            groupId,
            role: 'member',
            joinedAt: new Date().toISOString()
          }
        };
        await dynamodb.send(new PutCommand(membershipParams));
      }
    } else if (email || phone) {
      // Step 3: Create full account if email/phone provided but user not found
      const randomPassword = crypto.randomBytes(12).toString('base64').slice(0, 16);
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(randomPassword, saltRounds);

      const newUserId = uuidv4();
      const now = new Date().toISOString();

      user = {
        userId: newUserId,
        email: email ? email.toLowerCase() : null,
        firstName: firstName?.trim() || '',
        lastName: lastName?.trim() || '',
        phone: phone ? phone.replace(/\D/g, '') : null,
        password: hashedPassword,
        isAdmin: false,
        createdAt: now,
        updatedAt: now
      };

      await dynamodb.send(new PutCommand({ TableName: USERS_TABLE, Item: user }));

      await dynamodb.send(new PutCommand({
        TableName: USER_GROUPS_TABLE,
        Item: { userId: newUserId, groupId, role: 'member', joinedAt: now }
      }));

      isFullAccount = true;
      // Note: Do not return password
    }

    const { password: _, ...userResponse } = user;
    const displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown User';
    
    return {
      statusCode: isExistingUser ? 200 : 201,
      headers,
      body: JSON.stringify({
        success: true,
        message: isExistingUser ? 'Existing user added to group' : 'Full account created and added to group',
        user: {
          ...userResponse,
          displayName
        },
        isExistingUser,
        isFullAccount
      })
    };

  } catch (error) {
    console.error('Error adding user to group:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};


