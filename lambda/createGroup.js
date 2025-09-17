const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const { verifyAuthHeader } = require('./verifyJWT');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const GROUPS_TABLE = process.env.GROUPS_TABLE_NAME;
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
    // Verify admin authorization
    const authResult = await verifyAuthHeader(event.headers?.Authorization || event.headers?.authorization);
    if (!authResult.valid) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    // Any authenticated user can create groups
    const userId = authResult.payload?.userId;
    if (!userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token' })
      };
    }

    const { name, description, isPublic } = JSON.parse(event.body || '{}');
    
    // Validate required fields
    if (!name || !name.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Group name is required' })
      };
    }

    // Check if group name already exists
    const existingGroupQuery = {
      TableName: GROUPS_TABLE,
      IndexName: 'name-index',
      KeyConditionExpression: '#name = :name',
      ExpressionAttributeNames: {
        '#name': 'name'
      },
      ExpressionAttributeValues: {
        ':name': name.trim()
      }
    };

    const existingGroupResult = await dynamodb.send(new QueryCommand(existingGroupQuery));
    if (existingGroupResult.Items && existingGroupResult.Items.length > 0) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ 
          error: 'A group with this name already exists'
        })
      };
    }

    // Create new group
    const now = new Date().toISOString();
    const groupId = uuidv4();
    
    const newGroup = {
      groupId,
      name: name.trim(),
      description: description?.trim() || '',
      isPublic: Boolean(isPublic) ? 'true' : 'false', // Store as string for DynamoDB GSI
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      memberCount: 1, // Creator is automatically a member
      gameCount: 0
    };

    // Create the group
    await dynamodb.send(new PutCommand({
      TableName: GROUPS_TABLE,
      Item: newGroup,
      ConditionExpression: 'attribute_not_exists(groupId)'
    }));

    // Add creator as group owner
    const ownerMembership = {
      userId,
      groupId,
      role: 'owner',
      joinedAt: now,
      addedBy: userId // Self-added
    };

    await dynamodb.send(new PutCommand({
      TableName: USER_GROUPS_TABLE,
      Item: ownerMembership,
      ConditionExpression: 'attribute_not_exists(userId) AND attribute_not_exists(groupId)'
    }));

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: 'Group created successfully',
        group: {
          ...newGroup,
          isPublic: newGroup.isPublic === 'true' // Convert back to boolean for frontend
        },
        membership: ownerMembership
      })
    };

  } catch (error) {
    console.error('Error creating group:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error'
      })
    };
  }
};
