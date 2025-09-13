import { BEST_HAND_BET_AMOUNT } from '../constants/config';

// Calculate points for a player's position in a game
// Points = Split points for tied positions
export const calculatePoints = (results, playerResult) => {
  const totalPlayers = results.length;
  const position = playerResult.position;
  
  // Find all players with the same position (tied players)
  const tiedPlayers = results.filter(r => r.position === position);
  const tiedCount = tiedPlayers.length;
  
  if (tiedCount === 1) {
    // No tie - normal scoring: total players minus position
    return Math.max(0, totalPlayers - position);
  }
  
  // Handle ties: split points for all positions occupied by tied players
  // Example: 10 players, 3-way tie for 1st
  // They occupy positions 1, 2, 3
  // Points = (9 + 8 + 7) / 3 = 8 points each
  
  let totalPointsForTiedPositions = 0;
  for (let i = 0; i < tiedCount; i++) {
    const occupiedPosition = position + i;
    const pointsForThisPosition = Math.max(0, totalPlayers - occupiedPosition);
    totalPointsForTiedPositions += pointsForThisPosition;
  }
  
  // Split the total points evenly among tied players
  return totalPointsForTiedPositions / tiedCount;
};

// Calculate season standings for all players
export const calculateSeasonStandings = (games) => {
  const playerStats = {};

  games.forEach(game => {
    // Calculate best hand pot for this game
    const bestHandParticipants = game.results.filter(r => r.bestHandParticipant);
    const bestHandWinners = game.results.filter(r => r.bestHandWinner);
    const bestHandPot = bestHandParticipants.length * BEST_HAND_BET_AMOUNT;
    const bestHandWinningsPerWinner = bestHandWinners.length > 0 ? bestHandPot / bestHandWinners.length : 0;

    game.results.forEach(result => {
      const player = result.player;
      
      if (!playerStats[player]) {
        playerStats[player] = {
          player,
          games: 0,
          wins: 0,
          totalWinnings: 0,
          totalBuyins: 0,
          points: 0,
          bestHandWinnings: 0,
          bestHandCosts: 0,
          bestHandWinCount: 0,
          bestHandParticipationCount: 0,
          gameHistory: []
        };
      }

      const stats = playerStats[player];
      stats.games++;
      stats.totalWinnings += result.winnings;
      stats.totalBuyins += (20 + (result.rebuys * 20)); // $20 buyin + $20 per rebuy
      stats.points += calculatePoints(game.results, result);
      stats.gameHistory.push({
        date: game.date,
        position: result.position,
        winnings: result.winnings,
        rebuys: result.rebuys,
        points: calculatePoints(game.results, result)
      });

      if (result.position === 1) {
        stats.wins++;
      }

      // Best hand tracking
      if (result.bestHandParticipant) {
        stats.bestHandParticipationCount++;
        stats.bestHandCosts += BEST_HAND_BET_AMOUNT;
      }

      if (result.bestHandWinner) {
        stats.bestHandWinCount++;
        stats.bestHandWinnings += bestHandWinningsPerWinner;
      }
    });
  });

  // Calculate derived stats and streaks
  return Object.values(playerStats).map(stats => {
    const winnings = stats.totalWinnings + stats.bestHandWinnings;
    const totalBuyins = stats.totalBuyins + stats.bestHandCosts;
    const netWinnings = winnings - totalBuyins;
    const winRate = stats.games > 0 ? (stats.wins / stats.games * 100) : 0;
    const avgPosition = stats.gameHistory.length > 0 
      ? stats.gameHistory.reduce((sum, game) => sum + game.position, 0) / stats.gameHistory.length 
      : 0;

    // Calculate current streak
    const { currentStreak, streakType } = calculateStreak(stats.gameHistory);

    return {
      ...stats,
      winnings,
      totalBuyins,
      netWinnings,
      winRate,
      avgPosition,
      currentStreak,
      streakType
    };
  });
};

// Calculate current win/loss streak
const calculateStreak = (gameHistory) => {
  if (gameHistory.length === 0) {
    return { currentStreak: 0, streakType: null };
  }

  // Sort by date to get chronological order
  const sortedGames = [...gameHistory].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  let currentStreak = 0;
  let streakType = null;
  
  // Start from the most recent game and go backwards
  for (let i = sortedGames.length - 1; i >= 0; i--) {
    const game = sortedGames[i];
    const isWin = game.position === 1;
    
    if (currentStreak === 0) {
      // First game in streak
      currentStreak = 1;
      streakType = isWin ? 'win' : 'loss';
    } else if ((streakType === 'win' && isWin) || (streakType === 'loss' && !isWin)) {
      // Continue current streak
      currentStreak++;
    } else {
      // Streak broken
      break;
    }
  }
  
  return { currentStreak, streakType };
};

// Validation helpers
export const validateGameData = (gameData) => {
  const errors = [];

  if (!gameData.date) {
    errors.push('Game date is required');
  }

  if (!gameData.results || gameData.results.length === 0) {
    errors.push('At least one player result is required');
  }

  if (gameData.results) {
    // Check for duplicate players
    const playerNames = gameData.results.map(r => r.player.toLowerCase().trim());
    const duplicates = playerNames.filter((name, index) => name && playerNames.indexOf(name) !== index);
    if (duplicates.length > 0) {
      errors.push('Duplicate player names are not allowed');
    }

    // Validate individual results
    gameData.results.forEach((result, index) => {
      if (!result.player?.trim()) {
        errors.push(`Player name is required for position ${index + 1}`);
      }

      if (!result.position || result.position < 1) {
        errors.push(`Valid position is required for ${result.player || `player ${index + 1}`}`);
      }

      if (typeof result.winnings !== 'number') {
        errors.push(`Winnings must be a number for ${result.player || `player ${index + 1}`}`);
      }

      if (typeof result.rebuys !== 'number' || result.rebuys < 0) {
        errors.push(`Rebuys must be a non-negative number for ${result.player || `player ${index + 1}`}`);
      }
    });

    // Check for duplicate positions
    const positions = gameData.results.map(r => r.position).filter(p => p);
    const duplicatePositions = positions.filter((pos, index) => positions.indexOf(pos) !== index);
    if (duplicatePositions.length > 0) {
      errors.push('Duplicate positions are not allowed');
    }

    // Validate best hand logic
    const bestHandWinners = gameData.results.filter(r => r.bestHandWinner);
    const bestHandParticipants = gameData.results.filter(r => r.bestHandParticipant);
    
    if (bestHandWinners.length > bestHandParticipants.length) {
      errors.push('Best hand winners must also be participants');
    }

    bestHandWinners.forEach(winner => {
      if (!winner.bestHandParticipant) {
        errors.push(`${winner.player} won best hand but is not marked as participant`);
      }
    });
  }

  return errors;
};
