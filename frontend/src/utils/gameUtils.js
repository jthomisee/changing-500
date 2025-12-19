import { BEST_HAND_BET_AMOUNT } from '../constants/config';

// Calculate points for a player's position in a game
// Points = Split points for tied positions
export const calculatePoints = (results, playerResult) => {
  const totalPlayers = results.length;
  const position = playerResult.position;

  // Return 0 if position is not valid (undefined, null, 0, or non-numeric)
  if (!position || typeof position !== 'number' || position < 1) {
    return 0;
  }

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
export const calculateSeasonStandings = (games, users = []) => {
  console.warn('=== CALCULATE SEASON STANDINGS START ===');
  console.warn(`Total games: ${games.length}, Total users: ${users.length}`);

  const playerStats = {};

  // Create a lookup map for users by ID
  const userLookup = {};
  users.forEach((user) => {
    userLookup[user.userId] = user;
  });

  // Filter out scheduled games from leaderboard calculations
  const completedGames = games.filter((game) => game.status !== 'scheduled');

  completedGames.forEach((game, gameIndex) => {
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

      const winnings = Number(result.winnings) || 0;
      stats.totalWinnings += winnings;

      const rebuys = Number(result.rebuys) || 0;
      stats.totalBuyins += gameBuyinAmount + rebuys * gameBuyinAmount; // Use game's buyin + rebuy amounts

      // Calculate points for tournament
      stats.points += calculatePoints(game.results, result);

      stats.gameHistory.push({
        date: game.date,
        position: result.position,
        winnings: result.winnings || 0,
        rebuys: result.rebuys || 0,
        points: calculatePoints(game.results, result),
        buyin: gameBuyinAmount, // Track the buy-in for this specific game
      });

      // For tournament games, a "win" is finishing 1st or 2nd
      if (result.position === 1 || result.position === 2) {
        stats.wins++;
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

      // Log each game for the first player (for debugging)
      const isFirstPlayer =
        Object.keys(playerStats).length === 1 &&
        stats === Object.values(playerStats)[0];
      if (isFirstPlayer) {
        const runningTotalWinnings =
          stats.totalWinnings + stats.bestHandWinnings;
        const runningTotalBuyins = stats.totalBuyins + stats.bestHandCosts;
        const runningPL = runningTotalWinnings - runningTotalBuyins;

        console.warn(
          `Game ${gameIndex + 1} (${game.date}) - ${stats.user?.firstName || userId}:`
        );
        console.warn(
          `  Position: ${result.position}, Winnings: $${winnings}, Rebuys: ${rebuys}`
        );
        console.warn(
          `  Best Hand: ${bestHandParticipant ? 'Participated' : 'No'}, ${bestHandWinner ? 'WON' : ''}`
        );
        console.warn(
          `  Game Buyin: $${gameBuyinAmount + rebuys * gameBuyinAmount}, Best Hand: $${bestHandParticipant ? BEST_HAND_BET_AMOUNT : 0}`
        );
        console.warn(
          `  Game Net: $${winnings - (gameBuyinAmount + rebuys * gameBuyinAmount) - (bestHandParticipant ? BEST_HAND_BET_AMOUNT : 0) + (bestHandWinner ? bestHandWinningsPerWinner : 0)}`
        );
        console.warn(
          `  📊 RUNNING TOTALS: Winnings: $${runningTotalWinnings.toFixed(2)}, Buyins: $${runningTotalBuyins.toFixed(2)}, P&L: $${runningPL.toFixed(2)}`
        );
      }
    });
  });

  // Calculate derived stats and streaks
  return Object.values(playerStats).map((stats) => {
    const winnings = stats.totalWinnings + stats.bestHandWinnings;
    const totalBuyins = stats.totalBuyins + stats.bestHandCosts;
    const netWinnings = winnings - totalBuyins;
    const winRate = stats.games > 0 ? (stats.wins / stats.games) * 100 : 0;

    // Calculate average position
    const avgPosition =
      stats.gameHistory
        .filter((game) => game.position > 0)
        .reduce((sum, game, index, filteredGames) => {
          return index === filteredGames.length - 1
            ? (sum + game.position) / filteredGames.length
            : sum + game.position;
        }, 0) || 0;

    // Calculate current streak
    const { currentStreak, streakType } = calculateStreak(stats.gameHistory);

    // Log final stats for first player
    if (stats === Object.values(playerStats)[0]) {
      console.warn(
        `\n=== FINAL STATS FOR ${stats.user?.firstName || 'Unknown'} ===`
      );
      console.warn(`Total Games: ${stats.games}`);
      console.warn(`Tournament Winnings: $${stats.totalWinnings.toFixed(2)}`);
      console.warn(`Best Hand Winnings: $${stats.bestHandWinnings.toFixed(2)}`);
      console.warn(`Total Winnings: $${winnings.toFixed(2)}`);
      console.warn(`Tournament Buyins: $${stats.totalBuyins.toFixed(2)}`);
      console.warn(`Best Hand Costs: $${stats.bestHandCosts.toFixed(2)}`);
      console.warn(`Total Buyins: $${totalBuyins.toFixed(2)}`);
      console.warn(`Net P&L: $${netWinnings.toFixed(2)}`);
      console.warn(
        `Best Hand Stats: ${stats.bestHandWinCount} wins / ${stats.bestHandParticipationCount} participations`
      );
      console.warn(`Current Streak: ${streakType} ${currentStreak}`);
    }

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

  // Filter out games with invalid positions (shouldn't count toward streaks)
  const validGames = gameHistory.filter(
    (game) => game.position && game.position > 0
  );

  if (validGames.length === 0) {
    return { currentStreak: 0, streakType: null };
  }

  // Sort by date to get chronological order
  const sortedGames = [...validGames].sort(
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
    const playerTP = Number.isInteger(sideBet.timesParticipated)
      ? sideBet.timesParticipated
      : sideBet.participated
        ? 1
        : 0;

    if (sideBet.won) {
      // Compute weighted participants and winners based on timesParticipated
      let participantsWeight = 0;
      let winnersWeight = 0;

      allResults.forEach((r) => {
        const rSideBets = extractSideBetData(r);
        const rSideBet = rSideBets.find((sb) => sb.id === sideBet.id);
        if (!rSideBet) return;
        const tp = Number.isInteger(rSideBet.timesParticipated)
          ? rSideBet.timesParticipated
          : rSideBet.participated
            ? 1
            : 0;
        if (tp > 0) participantsWeight += tp;
        if (rSideBet.won && tp > 0) winnersWeight += tp;
      });

      const totalPot = participantsWeight * (sideBet.amount || 0);
      const winningsForThisPlayer =
        winnersWeight > 0 ? (playerTP / winnersWeight) * totalPot : 0;
      // Net winnings: share of pot minus player's cost
      return total + winningsForThisPlayer - playerTP * (sideBet.amount || 0);
    }

    if (playerTP > 0) {
      return total - playerTP * (sideBet.amount || 0);
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
