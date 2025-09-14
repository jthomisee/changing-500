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
      console.log('Searching for existing user by email/phone...');
      
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
          console.log('Found existing user by email:', user.userId);
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
          console.log('Found existing user by phone:', user.userId);
        }
      }
    }

    // Step 2: If user found, add them to the group (if not already a member)
    if (isExistingUser) {
      console.log('Adding existing user to group...');
      
      // Check if user is already in the group
      const existingMembership = await dynamodb.send(new GetCommand({
        TableName: USER_GROUPS_TABLE,
        Key: { userId: user.userId, groupId }
      }));

      if (!existingMembership.Item) {
        // Add user to group as member
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
        console.log('Added existing user to group as member');
      } else {
        console.log('User already in group');
      }
    } else if (email || phone) {
      // Step 3: Create full account if email/phone provided but user not found
      console.log('Creating new full account with email/phone...');
      
      // Generate secure random password
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
        isStub: false, // This is a full account
        createdAt: now,
        updatedAt: now
      };

      const createUserParams = {
        TableName: USERS_TABLE,
        Item: user
      };
      await dynamodb.send(new PutCommand(createUserParams));
      
      // Add user to group as member
      const membershipParams = {
        TableName: USER_GROUPS_TABLE,
        Item: {
          userId: newUserId,
          groupId,
          role: 'member',
          joinedAt: now
        }
      };
      await dynamodb.send(new PutCommand(membershipParams));
      
      isFullAccount = true;
      console.log('Created full account and added to group:', newUserId);
      // Note: We don't return the password to the client for security
    } else {
      // Step 4: Create stub account (current behavior) if no email/phone provided
      console.log('Creating stub account...');
      
      const stubUserId = uuidv4();
      const now = new Date().toISOString();
      
      user = {
        userId: stubUserId,
        firstName: firstName?.trim() || '',
        lastName: lastName?.trim() || '',
        phone: phone?.trim() || null,
        email: null,
        password: null, // No password for stub users
        isAdmin: false,
        isStub: true,
        createdAt: now,
        updatedAt: now
      };

      const createStubParams = {
        TableName: USERS_TABLE,
        Item: user
      };
      await dynamodb.send(new PutCommand(createStubParams));
      
      // Add stub user to group as member
      const membershipParams = {
        TableName: USER_GROUPS_TABLE,
        Item: {
          userId: stubUserId,
          groupId,
          role: 'member',
          joinedAt: now
        }
      };
      await dynamodb.send(new PutCommand(membershipParams));
      
      console.log('Created stub account and added to group:', stubUserId);
    }

    // Create stub user
    const stubUserId = uuidv4();
    const now = new Date().toISOString();
    
    const newStubUser = {
      userId: stubUserId,
      firstName: firstName?.trim() || '',
      lastName: lastName?.trim() || '',
      phone: phone?.trim() || null,
      // Note: email and password fields omitted for stub users to avoid GSI conflicts
      isAdmin: false,
      isStub: true,
      createdAt: now,
      updatedAt: now
    };

    const putParams = {
      TableName: USERS_TABLE,
      Item: newStubUser,
      ConditionExpression: 'attribute_not_exists(userId)'
    };

    await dynamodb.send(new PutCommand(putParams));

    // Return success response with user data (without password)
    const { password: _, ...userResponse } = user;
    const displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User';
    
    return {
      statusCode: isExistingUser ? 200 : 201,
      headers,
      body: JSON.stringify({
        success: true,
        message: isExistingUser ? 'Existing user added to group' : 
                 isFullAccount ? 'Full account created and added to group' :
                 'Guest account created and added to group',
        user: {
          ...userResponse,
          displayName
        },
        isExistingUser,
        isFullAccount,
        isGuestAccount: !isExistingUser && !isFullAccount
      })
    };

  } catch (error) {
    console.error('Error creating stub user:', error);
    console.error('Error stack:', error.stack);
    console.error('Error message:', error.message);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message // Add error details for debugging
      })
    };
  }
};
