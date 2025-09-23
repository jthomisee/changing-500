const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { verifyAuthHeader } = require('./verifyJWT');
const { migrateLegacySideBets, validateSideBets } = require('./utils/sideBetUtils');
const { validatePayoutStructure, cleanPayoutStructure } = require('./utils/payoutUtils');

// Helper function to reprocess waitlist when maxPlayers or waitlistEnabled changes
function reprocessWaitlist(results, maxPlayers, waitlistEnabled) {
  if (!waitlistEnabled) return []; // Clear waitlist if disabled
  if (!maxPlayers) return [];

  const confirmedPlayers = results.filter(r => r.rsvpStatus === 'yes').length;
  const waitlistedPlayers = results.filter(r => r.rsvpStatus === 'waitlisted');

  // If we're under capacity, no waitlist needed
  if (confirmedPlayers < maxPlayers) {
    return [];
  }

  // Return existing waitlist with updated positions
  return waitlistedPlayers.map((player, index) => ({
    userId: player.userId,
    addedAt: player.waitlistAddedAt || new Date().toISOString(),
    position: index + 1
  }));
}

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME;
const USER_GROUPS_TABLE = process.env.USER_GROUPS_TABLE_NAME;
const GROUPS_TABLE = process.env.GROUPS_TABLE_NAME;

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT'
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
    const gameId = event.pathParameters.id;
    const gameData = JSON.parse(event.body);
    
    // First, check if the game exists
    const getParams = {
      TableName: TABLE_NAME,
      Key: { id: gameId }
    };
    
    const existingGame = await dynamodb.send(new GetCommand(getParams));
    if (!existingGame.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'Game not found'
        })
      };
    }

    // Get the current game to check its group
    const currentGame = existingGame.Item;
    const groupId = gameData.groupId || currentGame.groupId;

    // Check if user has permission to edit games in this group
    const userId = authResult.payload?.userId;
    const isAdmin = authResult.payload?.isAdmin || false;

    if (!isAdmin) {
      // Check if user is an owner of the group
      if (!groupId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Game must belong to a group' 
          })
        };
      }

      const membershipResult = await dynamodb.send(new GetCommand({
        TableName: USER_GROUPS_TABLE,
        Key: { userId, groupId }
      }));

      if (!membershipResult.Item || membershipResult.Item.role !== 'owner') {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ 
            error: 'Only group owners can edit games for this group' 
          })
        };
      }
    }

    // Get group data to access side bet configurations
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
    const gameType = gameData.gameType || currentGame.gameType || 'tournament';
    let cleanedPayoutStructure = gameData.payoutStructure;
    if (gameType === 'tournament' && gameData.payoutStructure) {
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
    
    // Handle waitlist reprocessing if maxPlayers or waitlistEnabled changed
    let waitlistToUpdate = currentGame.waitlist || [];
    const waitlistEnabledChanged = gameData.waitlistEnabled !== undefined && gameData.waitlistEnabled !== currentGame.waitlistEnabled;
    const maxPlayersChanged = gameData.maxPlayers !== undefined && gameData.maxPlayers !== currentGame.maxPlayers;

    if (waitlistEnabledChanged || maxPlayersChanged) {
      const newWaitlistEnabled = gameData.waitlistEnabled !== undefined ? gameData.waitlistEnabled : currentGame.waitlistEnabled;
      const newMaxPlayers = gameData.maxPlayers !== undefined ? gameData.maxPlayers : currentGame.maxPlayers;
      waitlistToUpdate = reprocessWaitlist(resultsWithTies, newMaxPlayers, newWaitlistEnabled);
    }

    // Update the game (preserve existing gameNumber if not provided)
    const updateParams = {
      TableName: TABLE_NAME,
      Key: { id: gameId },
      UpdateExpression: 'SET #date = :date, #time = :time, results = :results, groupId = :groupId, #status = :status, #location = :location, selectedSideBets = :selectedSideBets, maxPlayers = :maxPlayers, waitlistEnabled = :waitlistEnabled, waitlist = :waitlist, gameType = :gameType, minBuyIn = :minBuyIn, maxBuyIn = :maxBuyIn, houseTake = :houseTake, houseTakeType = :houseTakeType, payoutStructure = :payoutStructure, updatedAt = :updatedAt, updatedBy = :updatedBy',
      ExpressionAttributeNames: {
        '#date': 'date', // 'date' is a reserved word in DynamoDB
        '#time': 'time', // 'time' is a reserved word in DynamoDB
        '#status': 'status', // 'status' is a reserved word in DynamoDB
        '#location': 'location'
      },
      ExpressionAttributeValues: {
        ':date': gameData.date,
        ':time': gameData.time || null,
        ':results': resultsWithTies,
        ':groupId': groupId,
        ':status': gameData.status || 'completed',
        ':location': gameData.location || null,
        ':selectedSideBets': gameData.selectedSideBets || [],
        ':maxPlayers': gameData.maxPlayers,
        ':waitlistEnabled': gameData.waitlistEnabled !== undefined ? gameData.waitlistEnabled : (currentGame.waitlistEnabled || false),
        ':waitlist': waitlistToUpdate,
        ':gameType': gameData.gameType || currentGame.gameType || 'tournament',
        ':minBuyIn': gameData.minBuyIn !== undefined ? gameData.minBuyIn : (currentGame.minBuyIn || null),
        ':maxBuyIn': gameData.maxBuyIn !== undefined ? gameData.maxBuyIn : (currentGame.maxBuyIn || null),
        ':houseTake': gameData.houseTake !== undefined ? gameData.houseTake : (currentGame.houseTake || 0),
        ':houseTakeType': gameData.houseTakeType || currentGame.houseTakeType || 'fixed',
        ':payoutStructure': cleanedPayoutStructure || currentGame.payoutStructure || [
          { position: 1, type: 'percentage', value: 70 },
          { position: 2, type: 'buyin_return', value: 0 }
        ],
        ':updatedAt': new Date().toISOString(),
        ':updatedBy': userId
      },
      ReturnValues: 'ALL_NEW'
    };


    const result = await dynamodb.send(new UpdateCommand(updateParams));
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Game updated successfully',
        game: result.Attributes
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to update game'
      })
    };
  }
};