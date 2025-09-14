const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { verifyAuthHeader } = require('./verifyJWT');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const GROUPS_TABLE = process.env.GROUPS_TABLE_NAME;
const USER_GROUPS_TABLE = process.env.USER_GROUPS_TABLE_NAME;
const USERS_TABLE = process.env.USERS_TABLE_NAME;

exports.handler = async (event) => {
  // CORS headers for all responses
  const headers = {
    'Access-Control-Allow-Origin': event.headers?.origin || '*',
    'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
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
    // Verify user authorization
    const authResult = await verifyAuthHeader(event.headers?.Authorization || event.headers?.authorization);
    if (!authResult.valid) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    const requestingUserId = authResult.payload?.userId;
    if (!requestingUserId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token' })
      };
    }

    const groupId = event.pathParameters?.groupId;
    if (!groupId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Group ID is required' })
      };
    }

    // Check if group exists
    const groupResult = await dynamodb.send(new GetCommand({
      TableName: GROUPS_TABLE,
      Key: { groupId }
    }));

    if (!groupResult.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Group not found' })
      };
    }

    // Check requesting user's permissions in the group
    const requestingUserMembership = await dynamodb.send(new GetCommand({
      TableName: USER_GROUPS_TABLE,
      Key: { userId: requestingUserId, groupId }
    }));

    const isAdmin = authResult.payload?.isAdmin || false;
    const isGroupOwner = requestingUserMembership.Item?.role === 'owner';

    if (!isAdmin && !isGroupOwner) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ 
          error: 'Only group owners or admins can manage group members' 
        })
      };
    }

    // Handle different HTTP methods
    switch (event.httpMethod) {
      case 'GET':
        return await listGroupMembers(groupId, headers);
      
      case 'PUT':
        return await updateMemberRole(groupId, event.pathParameters?.userId, event.body, requestingUserId, headers);
      
      case 'POST':
        return await addGroupMember(groupId, event.body, requestingUserId, headers);
      
      case 'DELETE':
        return await removeGroupMember(groupId, event.pathParameters?.userId, requestingUserId, headers);
      
      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

  } catch (error) {
    console.error('Error managing group members:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error'
      })
    };
  }
};

// List all members of a group
const listGroupMembers = async (groupId, headers) => {
  try {
    const membersResult = await dynamodb.send(new QueryCommand({
      TableName: USER_GROUPS_TABLE,
      IndexName: 'groupId-index',
      KeyConditionExpression: 'groupId = :groupId',
      ExpressionAttributeValues: {
        ':groupId': groupId
      }
    }));

    const members = [];
    for (const membership of membersResult.Items || []) {
      try {
        const userResult = await dynamodb.send(new GetCommand({
          TableName: USERS_TABLE,
          Key: { userId: membership.userId }
        }));

        if (userResult.Item) {
          members.push({
            userId: membership.userId,
            role: membership.role,
            joinedAt: membership.joinedAt,
            addedBy: membership.addedBy,
            firstName: userResult.Item.firstName,
            lastName: userResult.Item.lastName,
            email: userResult.Item.email
          });
        }
      } catch (error) {
        console.error(`Error fetching user ${membership.userId}:`, error);
      }
    }

    // Sort by role (owners first) then by join date
    members.sort((a, b) => {
      if (a.role === 'owner' && b.role !== 'owner') return -1;
      if (b.role === 'owner' && a.role !== 'owner') return 1;
      return new Date(a.joinedAt) - new Date(b.joinedAt);
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        members,
        count: members.length
      })
    };

  } catch (error) {
    console.error('Error listing group members:', error);
    throw error;
  }
};

// Update a member's role
const updateMemberRole = async (groupId, targetUserId, body, requestingUserId, headers) => {
  try {
    if (!targetUserId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Target user ID is required' })
      };
    }

    const { role } = JSON.parse(body || '{}');
    
    if (!role || !['owner', 'member'].includes(role)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Valid role is required (owner or member)' 
        })
      };
    }

    // Check if target user is a member of the group
    const membershipResult = await dynamodb.send(new GetCommand({
      TableName: USER_GROUPS_TABLE,
      Key: { userId: targetUserId, groupId }
    }));

    if (!membershipResult.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User is not a member of this group' })
      };
    }

    // Update the role
    const now = new Date().toISOString();
    const updateResult = await dynamodb.send(new UpdateCommand({
      TableName: USER_GROUPS_TABLE,
      Key: { userId: targetUserId, groupId },
      UpdateExpression: 'SET #role = :role, updatedAt = :updatedAt, updatedBy = :updatedBy',
      ExpressionAttributeNames: {
        '#role': 'role'
      },
      ExpressionAttributeValues: {
        ':role': role,
        ':updatedAt': now,
        ':updatedBy': requestingUserId
      },
      ReturnValues: 'ALL_NEW'
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: `User role updated to ${role}`,
        membership: updateResult.Attributes
      })
    };

  } catch (error) {
    console.error('Error updating member role:', error);
    throw error;
  }
};

// Add a member to the group
const addGroupMember = async (groupId, body, requestingUserId, headers) => {
  try {
    const { userId, role = 'member' } = JSON.parse(body || '{}');
    
    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'User ID is required' })
      };
    }

    if (!['owner', 'member'].includes(role)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Valid role is required (owner or member)' 
        })
      };
    }

    // Check if user exists
    const userResult = await dynamodb.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { userId }
    }));

    if (!userResult.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    // Check if user is already a member
    const existingMembership = await dynamodb.send(new GetCommand({
      TableName: USER_GROUPS_TABLE,
      Key: { userId, groupId }
    }));

    if (existingMembership.Item) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ 
          error: 'User is already a member of this group'
        })
      };
    }

    // Add the membership
    const now = new Date().toISOString();
    const membership = {
      userId,
      groupId,
      role,
      joinedAt: now,
      addedBy: requestingUserId
    };

    await dynamodb.send(new PutCommand({
      TableName: USER_GROUPS_TABLE,
      Item: membership
    }));

    // Note: memberCount is now calculated dynamically in listGroups

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: 'User added to group successfully',
        membership
      })
    };

  } catch (error) {
    console.error('Error adding group member:', error);
    throw error;
  }
};

// Remove a member from the group
const removeGroupMember = async (groupId, targetUserId, requestingUserId, headers) => {
  try {
    if (!targetUserId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Target user ID is required' })
      };
    }

    // Check if target user is a member of the group
    const membershipResult = await dynamodb.send(new GetCommand({
      TableName: USER_GROUPS_TABLE,
      Key: { userId: targetUserId, groupId }
    }));

    if (!membershipResult.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User is not a member of this group' })
      };
    }

    // Remove the membership
    await dynamodb.send(new DeleteCommand({
      TableName: USER_GROUPS_TABLE,
      Key: { userId: targetUserId, groupId }
    }));

    // Note: memberCount is now calculated dynamically in listGroups

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'User removed from group successfully'
      })
    };

  } catch (error) {
    console.error('Error removing group member:', error);
    throw error;
  }
};
