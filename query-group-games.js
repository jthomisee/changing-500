// Query to scan all games for a specific group
// Run with: node query-group-games.js

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

const GAMES_TABLE = process.env.TABLE_NAME || 'poker-games-dev';
const GROUP_ID = '0fb08aab-f134-422b-9d95-48d263e6bf66';

async function queryGroupGames() {
  console.log(`\n=== Querying games for group: ${GROUP_ID} ===\n`);

  try {
    let allGames = [];
    let lastEvaluatedKey = null;
    let pageCount = 0;

    // Keep querying until we get all games (handle pagination)
    do {
      pageCount++;
      console.log(`\nFetching page ${pageCount}...`);

      const params = {
        TableName: GAMES_TABLE,
        IndexName: 'groupId-index',
        KeyConditionExpression: 'groupId = :groupId',
        ExpressionAttributeValues: { ':groupId': GROUP_ID }
      };

      if (lastEvaluatedKey) {
        params.ExclusiveStartKey = lastEvaluatedKey;
      }

      const result = await dynamodb.send(new QueryCommand(params));
      const pageGames = result.Items || [];

      console.log(`  - Retrieved ${pageGames.length} games`);
      allGames.push(...pageGames);

      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    console.log(`\n=== SUMMARY ===`);
    console.log(`Total games found: ${allGames.length}`);
    console.log(`Pages fetched: ${pageCount}\n`);

    // Analyze games
    const completedGames = allGames.filter(g => g.status !== 'scheduled');
    const scheduledGames = allGames.filter(g => g.status === 'scheduled');

    console.log(`Completed games: ${completedGames.length}`);
    console.log(`Scheduled games: ${scheduledGames.length}\n`);

    // Sort by date
    const sortedGames = allGames.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      return dateCompare !== 0 ? dateCompare : (b.gameNumber || 0) - (a.gameNumber || 0);
    });

    // Show each game summary
    console.log(`=== GAME LIST (newest first) ===\n`);
    sortedGames.forEach((game, idx) => {
      const status = game.status || 'completed';
      const playerCount = game.results?.length || 0;

      console.log(`${idx + 1}. ${game.date} - ${status} - ${playerCount} players - ID: ${game.id}`);

      // Show first game's full structure
      if (idx === 0) {
        console.log(`\n   First game details:`);
        console.log(`   - Buy-in: $${game.buyin || 20}`);
        console.log(`   - Game type: ${game.gameType || 'undefined'}`);
        console.log(`   - Location: ${game.location || 'N/A'}`);
        console.log(`   - Results count: ${game.results?.length || 0}`);

        if (game.results && game.results.length > 0) {
          console.log(`\n   Sample result (first player):`);
          const firstResult = game.results[0];
          console.log(`   - User ID: ${firstResult.userId}`);
          console.log(`   - Position: ${firstResult.position}`);
          console.log(`   - Winnings: $${firstResult.winnings || 0}`);
          console.log(`   - Rebuys: ${firstResult.rebuys || 0}`);
          console.log(`   - Best Hand Participant: ${firstResult.bestHandParticipant || false}`);
          console.log(`   - Best Hand Winner: ${firstResult.bestHandWinner || false}`);
          console.log(`   - Cash Out Amount: ${firstResult.cashOutAmount || 'N/A'}`);
          console.log(`   - Buy In Amount: ${firstResult.buyInAmount || 'N/A'}`);
        }
        console.log('');
      }
    });

    // Count stats across all games
    console.log(`\n=== PLAYER STATS ACROSS ALL GAMES ===\n`);
    const playerStats = {};

    completedGames.forEach(game => {
      if (!game.results) return;

      game.results.forEach(result => {
        const userId = result.userId;
        if (!userId) return;

        if (!playerStats[userId]) {
          playerStats[userId] = {
            games: 0,
            totalWinnings: 0,
            bestHandWins: 0,
            bestHandParticipations: 0,
            positions: []
          };
        }

        playerStats[userId].games++;
        playerStats[userId].totalWinnings += Number(result.winnings) || 0;
        playerStats[userId].positions.push(result.position);

        if (result.bestHandParticipant) {
          playerStats[userId].bestHandParticipations++;
        }
        if (result.bestHandWinner) {
          playerStats[userId].bestHandWins++;
        }
      });
    });

    // Show top 5 players by games played
    const topPlayers = Object.entries(playerStats)
      .sort((a, b) => b[1].games - a[1].games)
      .slice(0, 5);

    topPlayers.forEach(([userId, stats], idx) => {
      console.log(`${idx + 1}. User ${userId.slice(-8)}:`);
      console.log(`   - Games: ${stats.games}`);
      console.log(`   - Total Winnings: $${stats.totalWinnings.toFixed(2)}`);
      console.log(`   - Best Hand Wins: ${stats.bestHandWins}`);
      console.log(`   - Best Hand Participations: ${stats.bestHandParticipations}`);
      console.log(`   - Recent positions: ${stats.positions.slice(0, 5).join(', ')}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

queryGroupGames();
