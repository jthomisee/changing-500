const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, UpdateCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { verifyAuthHeader } = require('./verifyJWT');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const GROUPS_TABLE = process.env.GROUPS_TABLE_NAME;
const USER_GROUPS_TABLE = process.env.USER_GROUPS_TABLE_NAME;

exports.handler = async (event) => {
  // CORS headers for all responses
  const headers = {
    'Access-Control-Allow-Origin': event.headers?.origin || '*',
    'Access-Control-Allow-Methods': 'PUT, OPTIONS',
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

    const userId = authResult.payload?.userId;
    if (!userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token' })
      };
    }

    // Get groupId from path parameters
    const groupId = event.pathParameters?.groupId;
    if (!groupId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Group ID is required' })
      };
    }

    // Get the current group to verify it exists and check permissions
    const getGroupCommand = {
      TableName: GROUPS_TABLE,
      Key: { groupId }
    };

    const groupResult = await dynamodb.send(new GetCommand(getGroupCommand));
    if (!groupResult.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Group not found' })
      };
    }

    const group = groupResult.Item;

    // Check if user has permission to update this group
    // Must be admin or group owner
    const isAdmin = authResult.payload?.isAdmin;
    let hasPermission = isAdmin;

    if (!hasPermission) {
      // Check if user is owner of this group
      const membershipQuery = {
        TableName: USER_GROUPS_TABLE,
        KeyConditionExpression: 'userId = :userId AND groupId = :groupId',
        ExpressionAttributeValues: {
          ':userId': userId,
          ':groupId': groupId
        }
      };

      const membershipResult = await dynamodb.send(new QueryCommand(membershipQuery));
      if (membershipResult.Items && membershipResult.Items.length > 0) {
        const membership = membershipResult.Items[0];
        hasPermission = membership.role === 'owner';
      }
    }

    if (!hasPermission) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Insufficient permissions to update this group' })
      };
    }

    // Parse the request body
    const updateData = JSON.parse(event.body || '{}');

    // Validate and build update expression
    const allowedFields = ['name', 'description', 'isPublic'];
    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    Object.keys(updateData).forEach(field => {
      if (allowedFields.includes(field)) {
        const attributeName = `#${field}`;
        const attributeValue = `:${field}`;

        updateExpressions.push(`${attributeName} = ${attributeValue}`);
        expressionAttributeNames[attributeName] = field;

        // Handle isPublic field - convert to string for DynamoDB GSI compatibility
        if (field === 'isPublic') {
          expressionAttributeValues[attributeValue] = Boolean(updateData[field]) ? 'true' : 'false';
        } else {
          expressionAttributeValues[attributeValue] = updateData[field];
        }
      }
    });

    if (updateExpressions.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No valid fields to update' })
      };
    }

    // Add updatedAt timestamp
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    // Update the group
    const updateCommand = {
      TableName: GROUPS_TABLE,
      Key: { groupId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    };

    const updateResult = await dynamodb.send(new UpdateCommand(updateCommand));
    const updatedGroup = updateResult.Attributes;

    // Convert isPublic back to boolean for frontend
    if (updatedGroup.isPublic) {
      updatedGroup.isPublic = updatedGroup.isPublic === 'true';
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Group updated successfully',
        group: updatedGroup
      })
    };

  } catch (error) {
    console.error('Error updating group:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error'
      })
    };
  }
};