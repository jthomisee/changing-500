const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
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
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
    if (!authResult.valid) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    const userId = authResult.payload?.userId;
    const isAdmin = authResult.payload?.isAdmin || false;
    const groupId = event.pathParameters?.groupId;

    if (!groupId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Group ID is required' })
      };
    }

    // Check if user has permission to manage side bets for this group
    if (!isAdmin) {
      const membershipResult = await dynamodb.send(new GetCommand({
        TableName: USER_GROUPS_TABLE,
        Key: { userId, groupId }
      }));

      if (!membershipResult.Item || membershipResult.Item.role !== 'owner') {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ 
            error: 'Only group owners can manage side bets' 
          })
        };
      }
    }

    // Get the current group
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

    const group = groupResult.Item;
    const currentSideBets = group.sideBets || [];

    switch (event.httpMethod) {
      case 'GET':
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            sideBets: currentSideBets
          })
        };

      case 'POST':
        return await createSideBet(groupId, currentSideBets, event.body, headers);

      case 'PUT':
        const sideBetId = event.pathParameters?.sideBetId;
        if (!sideBetId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Side bet ID is required' })
          };
        }
        return await updateSideBet(groupId, currentSideBets, sideBetId, event.body, headers);

      case 'DELETE':
        const deleteSideBetId = event.pathParameters?.sideBetId;
        if (!deleteSideBetId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Side bet ID is required' })
          };
        }
        return await deleteSideBet(groupId, currentSideBets, deleteSideBetId, headers);

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

  } catch (error) {
    console.error('Error managing side bets:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

async function createSideBet(groupId, currentSideBets, requestBody, headers) {
  const { name, description, amount, defaultTimesParticipated } = JSON.parse(requestBody || '{}');

  // Validate required fields
  if (!name || !name.trim()) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Side bet name is required' })
    };
  }

  if (!amount || amount <= 0) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Side bet amount must be greater than 0' })
    };
  }

  if (defaultTimesParticipated !== undefined) {
    const dtp = Number(defaultTimesParticipated);
    if (!Number.isInteger(dtp) || dtp < 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'defaultTimesParticipated must be an integer >= 0' })
      };
    }
  }

  // Check if side bet name already exists
  const existingBet = currentSideBets.find(bet => 
    bet.name.toLowerCase().trim() === name.toLowerCase().trim()
  );
  
  if (existingBet) {
    return {
      statusCode: 409,
      headers,
      body: JSON.stringify({ error: 'A side bet with this name already exists' })
    };
  }

  const newSideBet = {
    id: uuidv4(),
    name: name.trim(),
    description: description?.trim() || '',
    amount: parseFloat(amount),
    ...(defaultTimesParticipated !== undefined && { defaultTimesParticipated: parseInt(defaultTimesParticipated) }),
    createdAt: new Date().toISOString(),
    isActive: true
  };

  const updatedSideBets = [...currentSideBets, newSideBet];

  // Update the group with new side bet
  await dynamodb.send(new UpdateCommand({
    TableName: GROUPS_TABLE,
    Key: { groupId },
    UpdateExpression: 'SET sideBets = :sideBets, updatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':sideBets': updatedSideBets,
      ':updatedAt': new Date().toISOString()
    }
  }));

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({
      message: 'Side bet created successfully',
      sideBet: newSideBet
    })
  };
}

async function updateSideBet(groupId, currentSideBets, sideBetId, requestBody, headers) {
  const { name, description, amount, isActive, defaultTimesParticipated } = JSON.parse(requestBody || '{}');

  const sideBetIndex = currentSideBets.findIndex(bet => bet.id === sideBetId);
  if (sideBetIndex === -1) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Side bet not found' })
    };
  }

  // Validate fields if provided
  if (name !== undefined && (!name || !name.trim())) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Side bet name cannot be empty' })
    };
  }

  if (amount !== undefined && amount <= 0) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Side bet amount must be greater than 0' })
    };
  }

  if (defaultTimesParticipated !== undefined) {
    const dtp = Number(defaultTimesParticipated);
    if (!Number.isInteger(dtp) || dtp < 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'defaultTimesParticipated must be an integer >= 0' })
      };
    }
  }

  // Check if new name conflicts with existing side bets (excluding current one)
  if (name && name.trim()) {
    const conflictingBet = currentSideBets.find((bet, index) => 
      index !== sideBetIndex && 
      bet.name.toLowerCase().trim() === name.toLowerCase().trim()
    );
    
    if (conflictingBet) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: 'A side bet with this name already exists' })
      };
    }
  }

  // Update the side bet
  const updatedSideBets = [...currentSideBets];
  updatedSideBets[sideBetIndex] = {
    ...updatedSideBets[sideBetIndex],
    ...(name !== undefined && { name: name.trim() }),
    ...(description !== undefined && { description: description?.trim() || '' }),
    ...(amount !== undefined && { amount: parseFloat(amount) }),
    ...(isActive !== undefined && { isActive: Boolean(isActive) }),
    ...(defaultTimesParticipated !== undefined && { defaultTimesParticipated: parseInt(defaultTimesParticipated) }),
    updatedAt: new Date().toISOString()
  };

  // Update the group
  await dynamodb.send(new UpdateCommand({
    TableName: GROUPS_TABLE,
    Key: { groupId },
    UpdateExpression: 'SET sideBets = :sideBets, updatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':sideBets': updatedSideBets,
      ':updatedAt': new Date().toISOString()
    }
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: 'Side bet updated successfully',
      sideBet: updatedSideBets[sideBetIndex]
    })
  };
}

async function deleteSideBet(groupId, currentSideBets, sideBetId, headers) {
  const sideBetIndex = currentSideBets.findIndex(bet => bet.id === sideBetId);
  if (sideBetIndex === -1) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Side bet not found' })
    };
  }

  // Remove the side bet
  const updatedSideBets = currentSideBets.filter(bet => bet.id !== sideBetId);

  // Update the group
  await dynamodb.send(new UpdateCommand({
    TableName: GROUPS_TABLE,
    Key: { groupId },
    UpdateExpression: 'SET sideBets = :sideBets, updatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':sideBets': updatedSideBets,
      ':updatedAt': new Date().toISOString()
    }
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: 'Side bet deleted successfully'
    })
  };
}
