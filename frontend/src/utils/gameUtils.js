import { BEST_HAND_BET_AMOUNT } from '../constants/config';

// Calculate points for a player's position in a game
// Points = Split points for tied positions
// Returns 0 for cash games (no points system)
export const calculatePoints = (
  results,
  playerResult,
  gameType = 'tournament'
) => {
  // Cash games don't use points
  if (gameType === 'cash') {
    return 0;
  }

  const totalPlayers = results.length;
  const position = playerResult.position;

  // Find all players with the same position (tied players)
  const tiedPlayers = results.filter((r) => r.position === position);
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
export const calculateSeasonStandings = (
  games,
  users = [],
  gameTypeFilter = null
) => {
  const playerStats = {};

  // Create a lookup map for users by ID
  const userLookup = {};
  users.forEach((user) => {
    userLookup[user.userId] = user;
  });

  // Filter out scheduled games from leaderboard calculations
  let completedGames = games.filter((game) => game.status !== 'scheduled');

  // Filter by game type if specified
  if (gameTypeFilter) {
    completedGames = completedGames.filter(
      (game) => game.gameType === gameTypeFilter
    );
  }

  completedGames.forEach((game) => {
    // Use the game's configured buy-in amount, default to $20 if not set
    const gameBuyinAmount = game.buyin || 20;

    // Calculate best hand pot for this game - handle both legacy and new format
    const bestHandParticipants = game.results.filter((r) => {
      // Check legacy format
      if (r.bestHandParticipant !== undefined) {
        return Boolean(r.bestHandParticipant);
      }
      // Check new sideBets format
      if (r.sideBets && Array.isArray(r.sideBets)) {
        const bestHandSideBet = r.sideBets.find(
          (sb) =>
            (sb.name && sb.name.toLowerCase().includes('best hand')) ||
            sb.sideBetId === 'legacy-best-hand'
        );
        return bestHandSideBet ? Boolean(bestHandSideBet.participated) : false;
      }
      return false;
    });

    const bestHandWinners = game.results.filter((r) => {
      // Check legacy format
      if (r.bestHandWinner !== undefined) {
        return Boolean(r.bestHandWinner);
      }
      // Check new sideBets format
      if (r.sideBets && Array.isArray(r.sideBets)) {
        const bestHandSideBet = r.sideBets.find(
          (sb) =>
            (sb.name && sb.name.toLowerCase().includes('best hand')) ||
            sb.sideBetId === 'legacy-best-hand'
        );
        return bestHandSideBet ? Boolean(bestHandSideBet.won) : false;
      }
      return false;
    });
    const bestHandPot = bestHandParticipants.length * BEST_HAND_BET_AMOUNT;
    const bestHandWinningsPerWinner =
      bestHandWinners.length > 0 ? bestHandPot / bestHandWinners.length : 0;

    game.results.forEach((result) => {
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
          console.warn('User not found for game result:', {
            userId,
            gameDate: game.date,
          });
        }

        user = {
          userId: userId,
          firstName: 'Unknown',
          lastName: 'User',
          email: `unknown-${userId.slice(-8)}@placeholder.com`,
          displayName: `Unknown User (${userId.slice(-8)})`,
          isPlaceholder: true, // Flag to indicate this is a placeholder
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
          gameHistory: [],
        };
      }

      const stats = playerStats[userId];
      stats.games++;
      stats.totalWinnings += result.winnings;
      stats.totalBuyins +=
        gameBuyinAmount + (result.rebuys || 0) * gameBuyinAmount; // Use game's buyin + rebuy amounts

      // Only calculate points for tournament games
      if (game.gameType !== 'cash') {
        stats.points += calculatePoints(game.results, result, game.gameType);
      }

      stats.gameHistory.push({
        date: game.date,
        position: result.position,
        winnings: result.winnings,
        rebuys: result.rebuys || 0,
        points:
          game.gameType === 'cash'
            ? 0
            : calculatePoints(game.results, result, game.gameType),
        buyin: gameBuyinAmount, // Track the buy-in for this specific game
        gameType: game.gameType, // Track game type for history
      });

      // Define wins differently for cash vs tournament games
      if (game.gameType === 'cash') {
        // For cash games, a "win" is a profitable session
        if (result.winnings > 0) {
          stats.wins++;
        }
      } else {
        // For tournament games, a "win" is finishing 1st or 2nd
        if (result.position === 1 || result.position === 2) {
          stats.wins++;
        }
      }

      // Side bet tracking
      let bestHandParticipant = false;
      let bestHandWinner = false;

      // Check legacy format first
      if (
        result.bestHandParticipant !== undefined ||
        result.bestHandWinner !== undefined
      ) {
        bestHandParticipant = Boolean(result.bestHandParticipant);
        bestHandWinner = Boolean(result.bestHandWinner);
      }
      // Check new sideBets format
      else if (result.sideBets && Array.isArray(result.sideBets)) {
        const bestHandSideBet = result.sideBets.find(
          (sb) =>
            (sb.name && sb.name.toLowerCase().includes('best hand')) ||
            sb.sideBetId === 'legacy-best-hand'
        );
        if (bestHandSideBet) {
          bestHandParticipant = Boolean(bestHandSideBet.participated);
          bestHandWinner = Boolean(bestHandSideBet.won);
        }
      }

      if (bestHandParticipant) {
        stats.bestHandParticipationCount++;
        stats.bestHandCosts += BEST_HAND_BET_AMOUNT;
      }

      if (bestHandWinner) {
        stats.bestHandWinCount++;
        stats.bestHandWinnings += bestHandWinningsPerWinner;
      }
    });
  });

  // Calculate derived stats and streaks
  return Object.values(playerStats).map((stats) => {
    const winnings = stats.totalWinnings + stats.bestHandWinnings;
    const totalBuyins = stats.totalBuyins + stats.bestHandCosts;
    const netWinnings = winnings - totalBuyins;
    const winRate = stats.games > 0 ? (stats.wins / stats.games) * 100 : 0;

    // Only calculate tournament-specific stats if we have tournament games
    const hasTournamentGames = stats.gameHistory.some(
      (game) => game.gameType !== 'cash'
    );
    const avgPosition = hasTournamentGames
      ? stats.gameHistory
          .filter((game) => game.gameType !== 'cash' && game.position > 0)
          .reduce((sum, game, index, filteredGames) => {
            return index === filteredGames.length - 1
              ? (sum + game.position) / filteredGames.length
              : sum + game.position;
          }, 0) || 0
      : 0;

    // Calculate current streak (different logic for cash vs tournament)
    const { currentStreak, streakType } =
      gameTypeFilter === 'cash'
        ? calculateCashStreak(stats.gameHistory)
        : calculateStreak(stats.gameHistory);

    return {
      ...stats,
      // Add display name for compatibility with existing UI
      player: stats.user
        ? stats.user.isPlaceholder
          ? `${stats.user.displayName} (Removed)`
          : `${stats.user.firstName || ''} ${stats.user.lastName || ''}`.trim() ||
            stats.user.displayName ||
            stats.user.email ||
            'Unknown'
        : 'Unknown User',
      winnings,
      totalBuyins,
      netWinnings,
      winRate,
      avgPosition,
      currentStreak,
      streakType,
    };
  });
};

// Calculate current win/loss streak
const calculateStreak = (gameHistory) => {
  if (gameHistory.length === 0) {
    return { currentStreak: 0, streakType: null };
  }

  // Sort by date to get chronological order
  const sortedGames = [...gameHistory].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

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
    } else if (
      (streakType === 'win' && isWin) ||
      (streakType === 'loss' && !isWin)
    ) {
      // Continue current streak
      currentStreak++;
    } else {
      // Streak broken
      break;
    }
  }

  return { currentStreak, streakType };
};

// Calculate current profit/loss streak for cash games
const calculateCashStreak = (gameHistory) => {
  if (gameHistory.length === 0) {
    return { currentStreak: 0, streakType: null };
  }

  // Sort by date to get chronological order
  const sortedGames = [...gameHistory]
    .filter((game) => game.gameType === 'cash') // Only consider cash games
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (sortedGames.length === 0) {
    return { currentStreak: 0, streakType: null };
  }

  let currentStreak = 0;
  let streakType = null;

  // Start from the most recent game and work backwards
  for (let i = sortedGames.length - 1; i >= 0; i--) {
    const game = sortedGames[i];
    const isProfit = game.winnings > 0; // For cash games, profit = positive winnings

    if (currentStreak === 0) {
      // First game in streak
      currentStreak = 1;
      streakType = isProfit ? 'win' : 'loss';
    } else if (
      (streakType === 'win' && isProfit) ||
      (streakType === 'loss' && !isProfit)
    ) {
      // Continue current streak
      currentStreak++;
    } else {
      // Streak broken
      break;
    }
  }

  return { currentStreak, streakType };
};

// Calculate side bet winnings for a specific player result
export const calculateSideBetWinnings = (
  playerResult,
  allResults,
  groupSideBets = []
) => {
  // Extract side bet data from result (handles both legacy and new formats)
  const extractSideBetData = (result) => {
    const sideBetData = [];

    // Handle legacy format (bestHandParticipant/bestHandWinner)
    if (
      result.bestHandParticipant !== undefined ||
      result.bestHandWinner !== undefined
    ) {
      const legacySideBet = groupSideBets.find(
        (sb) => sb.name && sb.name.toLowerCase().includes('best hand')
      );
      if (legacySideBet) {
        sideBetData.push({
          id: 'legacy-best-hand',
          name: legacySideBet.name,
          amount: legacySideBet.amount,
          participated: Boolean(result.bestHandParticipant),
          won: Boolean(result.bestHandWinner),
        });
      }
    }

    // Handle new sideBets format
    if (result.sideBets && Array.isArray(result.sideBets)) {
      result.sideBets.forEach((sideBet) => {
        const groupSideBet = groupSideBets.find(
          (gsb) => gsb.id === sideBet.sideBetId
        );
        if (groupSideBet) {
          sideBetData.push({
            id: sideBet.sideBetId,
            name: groupSideBet.name,
            amount: groupSideBet.amount,
            participated: Boolean(sideBet.participated),
            won: Boolean(sideBet.won),
          });
        }
      });
    }

    return sideBetData;
  };

  const resultSideBets = extractSideBetData(playerResult);

  return resultSideBets.reduce((total, sideBet) => {
    if (sideBet.won) {
      // Winner gets the entire pot for this side bet
      const participants = allResults.filter((r) => {
        const rSideBets = extractSideBetData(r);
        const rSideBet = rSideBets.find((sb) => sb.id === sideBet.id);
        return rSideBet && rSideBet.participated;
      });
      const winners = allResults.filter((r) => {
        const rSideBets = extractSideBetData(r);
        const rSideBet = rSideBets.find((sb) => sb.id === sideBet.id);
        return rSideBet && rSideBet.won;
      });
      const totalPot = participants.length * (sideBet.amount || 0);
      const winningsPerWinner =
        winners.length > 0 ? totalPot / winners.length : 0;
      return total + winningsPerWinner - (sideBet.amount || 0); // Net winnings (pot share minus their bet)
    }
    if (sideBet.participated) {
      return total - (sideBet.amount || 0);
    }
    return total;
  }, 0);
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
    const playerIds = gameData.results.map((r) => r.userId);
    const duplicates = playerIds.filter(
      (id, index) => id && playerIds.indexOf(id) !== index
    );
    if (duplicates.length > 0) {
      errors.push('Duplicate players are not allowed');
    }

    // Validate individual results
    gameData.results.forEach((result, index) => {
      if (!result.userId?.trim()) {
        errors.push(`Player selection is required for position ${index + 1}`);
      }

      // Only validate position for completed games, not scheduled games
      if (gameData.status !== 'scheduled') {
        if (!result.position || result.position < 1) {
          errors.push(`Valid position is required for player ${index + 1}`);
        }
      }

      // Only validate winnings for completed games
      if (gameData.status !== 'scheduled') {
        if (typeof result.winnings !== 'number') {
          errors.push(`Winnings must be a number for player ${index + 1}`);
        }
      }

      if (typeof result.rebuys !== 'number' || result.rebuys < 0) {
        errors.push(
          `Rebuys must be a non-negative number for player ${index + 1}`
        );
      }
    });

    // Note: Duplicate positions are allowed for ties

    // Validate best hand logic - handle both legacy and new format
    const bestHandWinners = gameData.results.filter((r) => {
      // Check legacy format
      if (r.bestHandWinner !== undefined) {
        return Boolean(r.bestHandWinner);
      }
      // Check new sideBets format
      if (r.sideBets && Array.isArray(r.sideBets)) {
        const bestHandSideBet = r.sideBets.find(
          (sb) =>
            (sb.name && sb.name.toLowerCase().includes('best hand')) ||
            sb.sideBetId === 'legacy-best-hand'
        );
        return bestHandSideBet ? Boolean(bestHandSideBet.won) : false;
      }
      return false;
    });

    const bestHandParticipants = gameData.results.filter((r) => {
      // Check legacy format
      if (r.bestHandParticipant !== undefined) {
        return Boolean(r.bestHandParticipant);
      }
      // Check new sideBets format
      if (r.sideBets && Array.isArray(r.sideBets)) {
        const bestHandSideBet = r.sideBets.find(
          (sb) =>
            (sb.name && sb.name.toLowerCase().includes('best hand')) ||
            sb.sideBetId === 'legacy-best-hand'
        );
        return bestHandSideBet ? Boolean(bestHandSideBet.participated) : false;
      }
      return false;
    });

    if (bestHandWinners.length > bestHandParticipants.length) {
      errors.push('Best hand winners must also be participants');
    }

    // Check that each winner is also a participant
    gameData.results.forEach((result, index) => {
      let isWinner = false;
      let isParticipant = false;

      // Check legacy format
      if (
        result.bestHandWinner !== undefined ||
        result.bestHandParticipant !== undefined
      ) {
        isWinner = Boolean(result.bestHandWinner);
        isParticipant = Boolean(result.bestHandParticipant);
      }
      // Check new sideBets format
      else if (result.sideBets && Array.isArray(result.sideBets)) {
        const bestHandSideBet = result.sideBets.find(
          (sb) =>
            (sb.name && sb.name.toLowerCase().includes('best hand')) ||
            sb.sideBetId === 'legacy-best-hand'
        );
        if (bestHandSideBet) {
          isWinner = Boolean(bestHandSideBet.won);
          isParticipant = Boolean(bestHandSideBet.participated);
        }
      }

      if (isWinner && !isParticipant) {
        errors.push(
          `Player ${index + 1} won best hand but is not marked as participant`
        );
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
    default: { label: 'Pending', className: 'bg-gray-100 text-gray-800' },
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
  if (position === 1)
    return 'bg-gradient-to-r from-yellow-100 to-yellow-50 border-b border-gray-200 last:border-b-0';
  if (position === 2)
    return 'bg-gradient-to-r from-slate-200 to-slate-100 border-b border-gray-200 last:border-b-0';
  return 'border-b border-gray-200 last:border-b-0';
};
