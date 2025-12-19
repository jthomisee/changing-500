// Debug script to check game data directly from DynamoDB
// Run with: node debug-games.js YOUR_USER_ID

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

const GAMES_TABLE = process.env.TABLE_NAME || 'poker-games-dev';

async function debugUserGames(userId) {
  console.log(`\n=== Debugging games for user: ${userId} ===\n`);

  try {
    // Scan all games (inefficient but good for debugging)
    const result = await dynamodb.send(new ScanCommand({
      TableName: GAMES_TABLE
    }));

    const allGames = result.Items || [];
    console.log(`Total games in database: ${allGames.length}`);

    // Filter to games where user participated
    const userGames = allGames.filter(game => {
      return game.results && game.results.some(result => result.userId === userId);
    });

    console.log(`Games where user participated: ${userGames.length}\n`);

    // Analyze each game
    userGames.forEach((game, idx) => {
      const userResult = game.results.find(r => r.userId === userId);
      console.log(`\n--- Game ${idx + 1}: ${game.id} ---`);
      console.log(`Date: ${game.date}`);
      console.log(`Group: ${game.groupId}`);
      console.log(`Game Type: ${game.gameType || 'UNDEFINED'}`);
      console.log(`Status: ${game.status || 'completed'}`);
      console.log(`Total players: ${game.results.length}`);

      if (userResult) {
        console.log(`\nUser result found:`);
        console.log(`  - Position: ${userResult.position}`);
        console.log(`  - Winnings: ${userResult.winnings}`);
        console.log(`  - Rebuys: ${userResult.rebuys}`);
        console.log(`  - Has position: ${userResult.position !== undefined && userResult.position !== null}`);
      } else {
        console.log(`\nWARNING: User result NOT found despite filter!`);
        console.log(`Result userIds in game:`, game.results.map(r => r.userId));
      }
    });

    // Summary by gameType
    const gamesByType = userGames.reduce((acc, game) => {
      const type = game.gameType || 'undefined';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    console.log(`\n\n=== Summary ===`);
    console.log(`Games by type:`, gamesByType);

    // Check for games with missing positions
    const gamesWithoutPosition = userGames.filter(game => {
      const userResult = game.results.find(r => r.userId === userId);
      return !userResult || userResult.position === undefined || userResult.position === null;
    });

    console.log(`Games missing user position: ${gamesWithoutPosition.length}`);
    if (gamesWithoutPosition.length > 0) {
      console.log(`\nGames without position:`);
      gamesWithoutPosition.forEach(game => {
        const userResult = game.results.find(r => r.userId === userId);
        console.log(`  - ${game.id} (${game.date}): position = ${userResult?.position}, gameType = ${game.gameType || 'undefined'}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

// Get userId from command line
const userId = process.argv[2];
if (!userId) {
  console.error('Usage: node debug-games.js YOUR_USER_ID');
  process.exit(1);
}

debugUserGames(userId);
