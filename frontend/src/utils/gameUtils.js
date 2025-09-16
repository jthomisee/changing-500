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
export const calculateSeasonStandings = (games, users = []) => {
  const playerStats = {};

  // Create a lookup map for users by ID
  const userLookup = {};
  users.forEach(user => {
    userLookup[user.userId] = user;
  });

  // Filter out scheduled games from leaderboard calculations
  const completedGames = games.filter(game => game.status !== 'scheduled');

  completedGames.forEach(game => {
    // Use the game's configured buy-in amount, default to $20 if not set
    const gameBuyinAmount = game.buyin || 20;

    // Calculate best hand pot for this game
    const bestHandParticipants = game.results.filter(r => r.bestHandParticipant);
    const bestHandWinners = game.results.filter(r => r.bestHandWinner);
    const bestHandPot = bestHandParticipants.length * BEST_HAND_BET_AMOUNT;
    const bestHandWinningsPerWinner = bestHandWinners.length > 0 ? bestHandPot / bestHandWinners.length : 0;

    game.results.forEach(result => {
      // Use userId as the key instead of player name
      const userId = result.userId;
      let user = userLookup[userId];
      
      // Skip if no userId
      if (!userId) {
        console.warn('Game result missing userId:', result);
        return;
      }
      
      // Create placeholder user data if user not found (likely removed/deleted user)
      if (!user) {
        // Only warn if this is likely a real missing user (not a loading state issue)
        if (users.length > 0) {
          console.warn('User not found for game result:', { userId, gameDate: game.date });
        }
        
        user = {
          userId: userId,
          firstName: 'Unknown',
          lastName: 'User',
          email: `unknown-${userId.slice(-8)}@placeholder.com`,
          displayName: `Unknown User (${userId.slice(-8)})`,
          isPlaceholder: true // Flag to indicate this is a placeholder
        };
        // Add to lookup to avoid creating duplicates
        userLookup[userId] = user;
      }
      
      if (!playerStats[userId]) {
        playerStats[userId] = {
          userId,
          user, // Store user reference for easy access
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

      const stats = playerStats[userId];
      stats.games++;
      stats.totalWinnings += result.winnings;
      stats.totalBuyins += (gameBuyinAmount + (result.rebuys * gameBuyinAmount)); // Use game's buyin + rebuy amounts
      stats.points += calculatePoints(game.results, result);
      stats.gameHistory.push({
        date: game.date,
        position: result.position,
        winnings: result.winnings,
        rebuys: result.rebuys,
        points: calculatePoints(game.results, result),
        buyin: gameBuyinAmount // Track the buy-in for this specific game
      });

      if (result.position === 1 || result.position === 2) {
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
      // Add display name for compatibility with existing UI
      player: stats.user 
        ? stats.user.isPlaceholder
          ? `${stats.user.displayName} (Removed)`
          : `${stats.user.firstName || ''} ${stats.user.lastName || ''}`.trim() || stats.user.displayName || stats.user.email || 'Unknown'
        : 'Unknown User',
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
    const isWin = game.position === 1 || game.position === 2;
    
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
    const playerIds = gameData.results.map(r => r.userId);
    const duplicates = playerIds.filter((id, index) => id && playerIds.indexOf(id) !== index);
    if (duplicates.length > 0) {
      errors.push('Duplicate players are not allowed');
    }

    // Validate individual results
    gameData.results.forEach((result, index) => {
      if (!result.userId?.trim()) {
        errors.push(`Player selection is required for position ${index + 1}`);
      }

      if (!result.position || result.position < 1) {
        errors.push(`Valid position is required for player ${index + 1}`);
      }

      if (typeof result.winnings !== 'number') {
        errors.push(`Winnings must be a number for player ${index + 1}`);
      }

      if (typeof result.rebuys !== 'number' || result.rebuys < 0) {
        errors.push(`Rebuys must be a non-negative number for player ${index + 1}`);
      }
    });

    // Note: Duplicate positions are allowed for ties

    // Validate best hand logic
    const bestHandWinners = gameData.results.filter(r => r.bestHandWinner);
    const bestHandParticipants = gameData.results.filter(r => r.bestHandParticipant);
    
    if (bestHandWinners.length > bestHandParticipants.length) {
      errors.push('Best hand winners must also be participants');
    }

    bestHandWinners.forEach(winner => {
      if (!winner.bestHandParticipant) {
        errors.push(`Player won best hand but is not marked as participant`);
      }
    });
  }

  return errors;
};

// Check if a game is scheduled (not completed)
export const isGameScheduled = (game) => {
  return game.status === 'scheduled';
};

// Get RSVP status display info
export const getRSVPStatusInfo = (status) => {
  const statusMap = {
    yes: { label: 'Yes', className: 'bg-green-100 text-green-800' },
    no: { label: 'No', className: 'bg-red-100 text-red-800' },
    pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
    default: { label: 'Pending', className: 'bg-gray-100 text-gray-800' }
  };

  return statusMap[status] || statusMap.default;
};

// Sort RSVP results by status (yes, pending, no)
export const sortRSVPResults = (results) => {
  const order = { yes: 0, pending: 1, no: 2 };
  return results.slice().sort((a, b) => {
    return (order[a.rsvpStatus] || 1) - (order[b.rsvpStatus] || 1);
  });
};

// Sort game results by position
export const sortGameResultsByPosition = (results) => {
  return results.slice().sort((a, b) => a.position - b.position);
};

// Get row color class for game results display
export const getResultRowColorClass = (position) => {
  if (position === 1) return 'bg-gradient-to-r from-yellow-100 to-yellow-50 border-b border-gray-200 last:border-b-0';
  if (position === 2) return 'bg-gradient-to-r from-slate-200 to-slate-100 border-b border-gray-200 last:border-b-0';
  return 'border-b border-gray-200 last:border-b-0';
};
