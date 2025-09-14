const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, GetCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { verifyAuthHeader } = require('./verifyJWT');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const USER_GROUPS_TABLE = process.env.USER_GROUPS_TABLE_NAME;
const GROUPS_TABLE = process.env.GROUPS_TABLE_NAME;

exports.handler = async (event) => {
  // CORS headers for all responses
  const headers = {
    'Access-Control-Allow-Origin': event.headers?.origin || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
    const isAdmin = authResult.payload?.isAdmin || false;

    if (!userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token' })
      };
    }

    let groups = [];

    if (isAdmin) {
      // Admin: Return all groups in the system
      const allGroupsQuery = {
        TableName: GROUPS_TABLE
      };
      
      const allGroupsResult = await dynamodb.send(new ScanCommand(allGroupsQuery));
      const allGroups = allGroupsResult.Items || [];

      // Get admin's actual memberships to distinguish between admin-view and member
      const userGroupsQuery = {
        TableName: USER_GROUPS_TABLE,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        }
      };

      const userGroupsResult = await dynamodb.send(new QueryCommand(userGroupsQuery));
      const userMemberships = userGroupsResult.Items || [];
      const membershipMap = new Map(
        userMemberships.map(membership => [membership.groupId, membership.role])
      );

      // Calculate actual member counts for all groups
      const memberCounts = new Map();
      
      // Get all user-group relationships to calculate actual member counts
      const allMembershipsResult = await dynamodb.send(new ScanCommand({
        TableName: USER_GROUPS_TABLE,
        ProjectionExpression: 'groupId'
      }));
      
      // Count members per group
      (allMembershipsResult.Items || []).forEach(membership => {
        const count = memberCounts.get(membership.groupId) || 0;
        memberCounts.set(membership.groupId, count + 1);
      });

      // Mark each group with admin's relationship to it and actual member count
      groups = allGroups.map(group => ({
        ...group,
        memberCount: memberCounts.get(group.groupId) || 0, // Dynamic count
        userRole: membershipMap.has(group.groupId) ? membershipMap.get(group.groupId) : 'admin-view',
        actualMember: membershipMap.has(group.groupId),
        joinedAt: membershipMap.has(group.groupId) ? 
          userMemberships.find(m => m.groupId === group.groupId)?.joinedAt : null
      }));

    } else {
      // Regular user: Return only groups they belong to
      const userGroupsQuery = {
        TableName: USER_GROUPS_TABLE,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        }
      };

      const userGroupsResult = await dynamodb.send(new QueryCommand(userGroupsQuery));
      const userGroups = userGroupsResult.Items || [];

      // Get member counts for user's groups
      const userGroupIds = userGroups.map(ug => ug.groupId);
      const memberCounts = new Map();
      
      if (userGroupIds.length > 0) {
        // Get all memberships for these specific groups
        const membershipsResult = await dynamodb.send(new ScanCommand({
          TableName: USER_GROUPS_TABLE,
          FilterExpression: 'groupId IN (' + userGroupIds.map((_, i) => `:groupId${i}`).join(',') + ')',
          ExpressionAttributeValues: userGroupIds.reduce((acc, groupId, i) => {
            acc[`:groupId${i}`] = groupId;
            return acc;
          }, {}),
          ProjectionExpression: 'groupId'
        }));
        
        // Count members per group
        (membershipsResult.Items || []).forEach(membership => {
          const count = memberCounts.get(membership.groupId) || 0;
          memberCounts.set(membership.groupId, count + 1);
        });
      }

      // For each group membership, get the group details
      for (const membership of userGroups) {
        try {
          const groupQuery = {
            TableName: GROUPS_TABLE,
            Key: {
              groupId: membership.groupId
            }
          };
          
          const groupResult = await dynamodb.send(new GetCommand(groupQuery));
          if (groupResult.Item) {
            groups.push({
              ...groupResult.Item,
              memberCount: memberCounts.get(membership.groupId) || 0, // Dynamic count
              userRole: membership.role || 'member',
              actualMember: true,
              joinedAt: membership.joinedAt
            });
          }
        } catch (error) {
          console.error(`Error fetching group ${membership.groupId}:`, error);
          // Continue processing other groups even if one fails
        }
      }
    }

    // Sort groups by name
    groups.sort((a, b) => a.name.localeCompare(b.name));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        groups: groups,
        count: groups.length,
        isAdmin
      })
    };

  } catch (error) {
    console.error('Error listing user groups:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error'
      })
    };
  }
};