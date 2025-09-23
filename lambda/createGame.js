const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const { verifyAuthHeader } = require('./verifyJWT');
const { migrateLegacySideBets, validateSideBets } = require('./utils/sideBetUtils');
const { validatePayoutStructure, cleanPayoutStructure } = require('./utils/payoutUtils');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.GAMES_TABLE_NAME;
const USER_GROUPS_TABLE = process.env.USER_GROUPS_TABLE_NAME;
const GROUPS_TABLE = process.env.GROUPS_TABLE_NAME;

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,GET,POST'
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
    const gameData = JSON.parse(event.body);
    
    // Validate required fields including groupId
    if (!gameData.groupId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Group ID is required' })
      };
    }

    // Check if user has permission to create games in this group
    const userId = authResult.payload?.userId;
    const isAdmin = authResult.payload?.isAdmin || false;

    if (!isAdmin) {
      // Check if user is an owner of the group
      const membershipResult = await dynamodb.send(new GetCommand({
        TableName: USER_GROUPS_TABLE,
        Key: { userId, groupId: gameData.groupId }
      }));

      if (!membershipResult.Item || membershipResult.Item.role !== 'owner') {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ 
            error: 'Only group owners can create games for this group' 
          })
        };
      }
    }

    // Get group data to access side bet configurations
    const groupResult = await dynamodb.send(new GetCommand({
      TableName: GROUPS_TABLE,
      Key: { groupId: gameData.groupId }
    }));

    if (!groupResult.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Group not found' })
      };
    }

    const group = groupResult.Item;
    const groupSideBets = group.sideBets || [];
    
    // Process results to add rebuys, migrate legacy side bets, and detect ties
    const processedResults = gameData.results.map(result => {
      const baseResult = {
        ...result,
        rebuys: result.rebuys || 0 // Default to 0 if not provided
      };
      
      // Migrate legacy side bet data to new format
      return migrateLegacySideBets(baseResult, groupSideBets);
    });
    
    // Auto-detect ties by grouping results with same position
    const positionGroups = {};
    processedResults.forEach(result => {
      if (result.position) {
        if (!positionGroups[result.position]) {
          positionGroups[result.position] = [];
        }
        positionGroups[result.position].push(result);
      }
    });
    
    // Mark ties automatically
    const resultsWithTies = processedResults.map(result => {
      if (result.position && positionGroups[result.position].length > 1) {
        return { ...result, tied: true };
      }
      return { ...result, tied: false };
    });

    // Validate side bets
    const sideBetErrors = validateSideBets(resultsWithTies, groupSideBets);
    if (sideBetErrors.length > 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Side bet validation failed',
          details: sideBetErrors
        })
      };
    }

    // Clean and validate payout structure for tournament games
    let cleanedPayoutStructure = gameData.payoutStructure;
    if (gameData.gameType === 'tournament' && gameData.payoutStructure) {
      cleanedPayoutStructure = cleanPayoutStructure(gameData.payoutStructure);
      const payoutErrors = validatePayoutStructure(cleanedPayoutStructure);
      if (payoutErrors.length > 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Payout structure validation failed',
            details: payoutErrors
          })
        };
      }
    }
    
    // Generate unique ID
    const id = `game_${gameData.date.replace(/-/g, '')}_${uuidv4().substring(0, 8)}`;
    
    const item = {
      ...gameData,
      results: resultsWithTies,
      id,
      time: gameData.time || null,
      status: gameData.status || 'completed',
      createdAt: gameData.createdAt || new Date().toISOString(),
      selectedSideBets: gameData.selectedSideBets || [], // Track which side bets were selected for this game
      maxPlayers: gameData.maxPlayers, // Maximum number of players allowed (required field)
      waitlistEnabled: gameData.waitlistEnabled || false, // Whether waitlist is enabled
      waitlist: [], // Initialize empty waitlist

      // Game type and configuration
      gameType: gameData.gameType || 'tournament', // 'cash' or 'tournament'

      // Cash game settings
      minBuyIn: gameData.minBuyIn || null,
      maxBuyIn: gameData.maxBuyIn || null,

      // House take configuration
      houseTake: gameData.houseTake || 0,
      houseTakeType: gameData.houseTakeType || 'fixed', // 'fixed' or 'percentage'

      // Tournament payout structure
      payoutStructure: cleanedPayoutStructure || [
        { position: 1, type: 'percentage', value: 70 },
        { position: 2, type: 'buyin_return', value: 0 }
      ]
    };

    const params = {
      TableName: TABLE_NAME,
      Item: item
    };

    await dynamodb.send(new PutCommand(params));
    
    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        id: item.id,
        message: 'Game created successfully'
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to create game'
      })
    };
  }
};