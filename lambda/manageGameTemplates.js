const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { verifyAuthHeader } = require('./verifyJWT');
const { v4: uuidv4 } = require('uuid');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const GROUPS_TABLE = process.env.GROUPS_TABLE_NAME;
const USER_GROUPS_TABLE = process.env.USER_GROUPS_TABLE_NAME;

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,DELETE'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers
    };
  }

  // Verify JWT token for authentication
  const authResult = await verifyAuthHeader(event.headers?.Authorization || event.headers?.authorization);
  if (!authResult.valid) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({
        error: 'Unauthorized: ' + (authResult.error || 'Invalid token')
      })
    };
  }

  try {
    const groupId = event.pathParameters?.groupId;
    if (!groupId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Group ID is required' })
      };
    }

    const userId = authResult.payload?.userId;
    const isAdmin = authResult.payload?.isAdmin || false;

    // Check if user has permission to manage templates in this group
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
            error: 'Only group owners can manage game templates'
          })
        };
      }
    }

    // Get current group data
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
    const currentTemplates = group.gameTemplates || [];

    switch (event.httpMethod) {
      case 'GET':
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            templates: currentTemplates
          })
        };

      case 'POST':
        const newTemplate = JSON.parse(event.body);

        // Validate template
        if (!newTemplate.name || !newTemplate.name.trim()) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Template name is required' })
          };
        }

        // Check for duplicate names
        if (currentTemplates.some(t => t.name === newTemplate.name.trim())) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Template name already exists' })
          };
        }

        const template = {
          id: uuidv4(),
          name: newTemplate.name.trim(),
          description: newTemplate.description || '',
          location: newTemplate.location || '',
          buyin: newTemplate.buyin || null,
          maxPlayers: newTemplate.maxPlayers || null,
          waitlistEnabled: newTemplate.waitlistEnabled || false,
          players: newTemplate.players || [], // Array of user IDs
          sideBets: newTemplate.sideBets || [], // Array of side bet IDs

          // Game type and configuration
          gameType: newTemplate.gameType || 'tournament',
          minBuyIn: newTemplate.minBuyIn || null,
          maxBuyIn: newTemplate.maxBuyIn || null,

          createdAt: new Date().toISOString(),
          createdBy: userId
        };

        const updatedTemplates = [...currentTemplates, template];

        await dynamodb.send(new UpdateCommand({
          TableName: GROUPS_TABLE,
          Key: { groupId },
          UpdateExpression: 'SET gameTemplates = :templates',
          ExpressionAttributeValues: {
            ':templates': updatedTemplates
          }
        }));

        return {
          statusCode: 201,
          headers,
          body: JSON.stringify({
            message: 'Template created successfully',
            template
          })
        };

      case 'PUT':
        const templateId = event.pathParameters?.templateId;
        if (!templateId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Template ID is required' })
          };
        }

        const updateData = JSON.parse(event.body);
        const templateIndex = currentTemplates.findIndex(t => t.id === templateId);

        if (templateIndex === -1) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Template not found' })
          };
        }

        // Validate update
        if (updateData.name && !updateData.name.trim()) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Template name cannot be empty' })
          };
        }

        // Check for duplicate names (excluding current template)
        if (updateData.name && currentTemplates.some((t, i) => i !== templateIndex && t.name === updateData.name.trim())) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Template name already exists' })
          };
        }

        const updatedTemplate = {
          ...currentTemplates[templateIndex],
          ...updateData,
          name: updateData.name ? updateData.name.trim() : currentTemplates[templateIndex].name,
          updatedAt: new Date().toISOString(),
          updatedBy: userId
        };

        const templatesAfterUpdate = [...currentTemplates];
        templatesAfterUpdate[templateIndex] = updatedTemplate;

        await dynamodb.send(new UpdateCommand({
          TableName: GROUPS_TABLE,
          Key: { groupId },
          UpdateExpression: 'SET gameTemplates = :templates',
          ExpressionAttributeValues: {
            ':templates': templatesAfterUpdate
          }
        }));

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            message: 'Template updated successfully',
            template: updatedTemplate
          })
        };

      case 'DELETE':
        const deleteTemplateId = event.pathParameters?.templateId;
        if (!deleteTemplateId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Template ID is required' })
          };
        }

        const templatesAfterDelete = currentTemplates.filter(t => t.id !== deleteTemplateId);

        if (templatesAfterDelete.length === currentTemplates.length) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Template not found' })
          };
        }

        await dynamodb.send(new UpdateCommand({
          TableName: GROUPS_TABLE,
          Key: { groupId },
          UpdateExpression: 'SET gameTemplates = :templates',
          ExpressionAttributeValues: {
            ':templates': templatesAfterDelete
          }
        }));

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            message: 'Template deleted successfully'
          })
        };

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to manage game templates'
      })
    };
  }
};