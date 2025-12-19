import { calculatePoints, calculateSideBetWinnings } from './gameUtils';
import { BEST_HAND_BET_AMOUNT } from '../constants/config';

/**
 * Get all games where the user participated across all groups
 * @param {Array} allGames - All games from all groups
 * @param {Object} currentUser - Current user object
 * @param {Array} groups - All groups the user belongs to
 * @returns {Array} Array of games with group information where user participated
 */
export const getUserGamesAcrossGroups = (
  allGames,
  currentUser,
  groups = [],
  groupSideBetsMap = {}
) => {
  if (!currentUser?.userId || !allGames?.length) {
    return [];
  }

  // Create a map for quick group lookup
  const groupMap = groups.reduce((map, group) => {
    map[group.groupId] = group;
    return map;
  }, {});

  const userGames = [];

  allGames.forEach((game) => {
    // Find if user participated in this game
    const userResult = game.results?.find(
      (result) => result.userId === currentUser.userId
    );

    if (userResult) {
      // Get group information
      const group = groupMap[game.groupId];

      // Calculate side bet winnings
      const groupSideBets = groupSideBetsMap[game.groupId] || [];
      const sideBetWinnings = calculateSideBetWinnings(
        userResult,
        game.results,
        groupSideBets
      );

      // Calculate tournament values
      const actualWinnings = userResult.winnings || 0;
      const totalCost =
        (game.buyin || 20) + (userResult.rebuys || 0) * (game.buyin || 20);
      const userProfitLoss = actualWinnings - totalCost + sideBetWinnings;

      userGames.push({
        ...game,
        groupName: group?.name || 'Unknown Group',
        userResult,
        userPosition: userResult.position,
        userWinnings: actualWinnings, // Winnings should only be prize money, not side bets
        userSideBetWinnings: sideBetWinnings,
        userRebuys: userResult.rebuys,
        userProfitLoss, // P&L includes side bet winnings
        userTotalCost: totalCost,
        userPoints: calculatePoints(game.results, userResult),
        userBestHandParticipant: userResult.bestHandParticipant || false,
        userBestHandWinner: userResult.bestHandWinner || false,
        buyin: game.buyin || 20, // Default buyin if not specified
      });
    }
  });

  // Sort by date (newest first)
  return userGames.sort((a, b) => new Date(b.date) - new Date(a.date));
};

/**
 * Calculate combined statistics for a user across all groups
 * @param {Array} userGames - Array of games where user participated (from getUserGamesAcrossGroups)
 * @param {Object} currentUser - Current user object
 * @returns {Object} Combined statistics object
 */
export const calculateUserCombinedStats = (userGames, currentUser) => {
  console.warn('=== CALCULATE USER COMBINED STATS (Game History) ===');
  console.warn(
    `Processing ${userGames?.length || 0} games for user: ${currentUser?.firstName || 'Unknown'}`
  );

  if (!userGames?.length || !currentUser?.userId) {
    return {
      numGames: 0,
      winRate: 0,
      avgPosition: 0,
      totalWinnings: 0,
      totalCosts: 0,
      profitLoss: 0,
      wins: 0,
      bestHandParticipations: 0,
      bestHandWins: 0,
      bestHandWinnings: 0,
      bestHandCosts: 0,
    };
  }

  let stats = {
    numGames: userGames.length,
    wins: 0,
    totalWinnings: 0,
    totalBuyins: 0,
    totalPositions: 0,
    bestHandParticipations: 0,
    bestHandWins: 0,
    bestHandWinnings: 0,
    bestHandCosts: 0,
  };

  userGames.forEach((game, idx) => {
    const { userResult, buyin } = game;

    // Debug: Log userResult structure for first game
    if (idx === 0) {
      console.warn('📋 First game userResult structure:', {
        hasUserResult: !!userResult,
        hasSideBets: !!userResult?.sideBets,
        sideBetsLength: userResult?.sideBets?.length,
        sideBetsArray: userResult?.sideBets,
        bestHandParticipant: userResult?.bestHandParticipant,
        bestHandWinner: userResult?.bestHandWinner,
      });
    }

    // Use pre-calculated values from getUserGamesAcrossGroups
    stats.totalWinnings += game.userWinnings || 0;
    stats.totalBuyins += game.userTotalCost || 0;

    // Count positions for tournament games
    if (userResult.position) {
      stats.totalPositions += userResult.position;
    }

    // For tournament games, count 1st or 2nd place as wins
    if (userResult.position === 1 || userResult.position === 2) {
      stats.wins++;
    }

    // Best hand tracking - check both legacy and new formats
    let bestHandParticipant = false;
    let bestHandWinner = false;

    // Check legacy format first
    if (
      userResult.bestHandParticipant !== undefined ||
      userResult.bestHandWinner !== undefined
    ) {
      bestHandParticipant = Boolean(userResult.bestHandParticipant);
      bestHandWinner = Boolean(userResult.bestHandWinner);
      console.warn(
        `  ✅ Game ${idx + 1}: Using LEGACY format - participated: ${bestHandParticipant}, won: ${bestHandWinner}`
      );
    }
    // Check new sideBets format
    else if (userResult.sideBets && Array.isArray(userResult.sideBets)) {
      const bestHandSideBet = userResult.sideBets.find(
        (sb) =>
          (sb.name && sb.name.toLowerCase().includes('best hand')) ||
          sb.sideBetId === 'legacy-best-hand'
      );
      if (bestHandSideBet) {
        bestHandParticipant = Boolean(bestHandSideBet.participated);
        bestHandWinner = Boolean(bestHandSideBet.won);
        console.warn(
          `  ✅ Game ${idx + 1}: Using SIDEBETS format - participated: ${bestHandParticipant}, won: ${bestHandWinner}`,
          bestHandSideBet
        );
      } else {
        console.warn(
          `  ❌ Game ${idx + 1}: sideBets array exists but no best hand side bet found`,
          userResult.sideBets
        );
      }
    } else {
      console.warn(`  ⚠️ Game ${idx + 1}: No best hand data in either format`);
    }

    if (bestHandParticipant) {
      stats.bestHandParticipations++;
      stats.bestHandCosts += BEST_HAND_BET_AMOUNT;
    }

    if (bestHandWinner) {
      stats.bestHandWins++;
      // Calculate best hand winnings for this game - check both formats
      const bestHandParticipants = game.results.filter((r) => {
        if (r.bestHandParticipant !== undefined) {
          return Boolean(r.bestHandParticipant);
        }
        if (r.sideBets && Array.isArray(r.sideBets)) {
          const bhSideBet = r.sideBets.find(
            (sb) =>
              (sb.name && sb.name.toLowerCase().includes('best hand')) ||
              sb.sideBetId === 'legacy-best-hand'
          );
          return bhSideBet ? Boolean(bhSideBet.participated) : false;
        }
        return false;
      }).length;

      const bestHandWinners = game.results.filter((r) => {
        if (r.bestHandWinner !== undefined) {
          return Boolean(r.bestHandWinner);
        }
        if (r.sideBets && Array.isArray(r.sideBets)) {
          const bhSideBet = r.sideBets.find(
            (sb) =>
              (sb.name && sb.name.toLowerCase().includes('best hand')) ||
              sb.sideBetId === 'legacy-best-hand'
          );
          return bhSideBet ? Boolean(bhSideBet.won) : false;
        }
        return false;
      }).length;

      const totalBestHandPot = bestHandParticipants * BEST_HAND_BET_AMOUNT;
      const winningsPerWinner =
        bestHandWinners > 0 ? totalBestHandPot / bestHandWinners : 0;
      stats.bestHandWinnings += winningsPerWinner;
    }

    // Log each game with running totals
    const runningTournamentWinnings = stats.totalWinnings;
    const runningBestHandWinnings = stats.bestHandWinnings;
    const runningTotalWinnings =
      runningTournamentWinnings + runningBestHandWinnings;
    const runningTotalCosts = stats.totalBuyins + stats.bestHandCosts;
    const runningPL = runningTotalWinnings - runningTotalCosts;

    console.warn(`Game ${idx + 1} (${game.date}):`);
    console.warn(
      `  Position: ${userResult.position}, Tournament Winnings: $${game.userWinnings || 0}`
    );
    console.warn(
      `  Best Hand: ${bestHandParticipant ? 'Y' : 'N'}, Won: ${bestHandWinner ? 'Y' : 'N'}`
    );
    console.warn(
      `  Costs: Buyin+Rebuys=$${game.userTotalCost || 0}, Best Hand=$${bestHandParticipant ? BEST_HAND_BET_AMOUNT : 0}`
    );
    console.warn(
      `  📊 RUNNING: Tournament=$${runningTournamentWinnings.toFixed(2)}, BestHand=$${runningBestHandWinnings.toFixed(2)}, Total=$${runningTotalWinnings.toFixed(2)}, Costs=$${runningTotalCosts.toFixed(2)}, P&L=$${runningPL.toFixed(2)}`
    );
  });

  // Calculate derived stats
  const winRate = stats.numGames > 0 ? (stats.wins / stats.numGames) * 100 : 0;

  // Calculate average position
  const avgPosition =
    stats.numGames > 0 ? stats.totalPositions / stats.numGames : 0;

  const totalCosts = stats.totalBuyins + stats.bestHandCosts;
  const totalEarnings = stats.totalWinnings + stats.bestHandWinnings;
  const profitLoss = totalEarnings - totalCosts;

  console.warn('\n=== FINAL GAME HISTORY STATS ===');
  console.warn(`Tournament Winnings: $${stats.totalWinnings.toFixed(2)}`);
  console.warn(`Best Hand Winnings: $${stats.bestHandWinnings.toFixed(2)}`);
  console.warn(`Total Winnings (displayed): $${totalEarnings.toFixed(2)}`);
  console.warn(`Tournament Costs: $${stats.totalBuyins.toFixed(2)}`);
  console.warn(`Best Hand Costs: $${stats.bestHandCosts.toFixed(2)}`);
  console.warn(`Total Costs: $${totalCosts.toFixed(2)}`);
  console.warn(`P&L: $${profitLoss.toFixed(2)}`);
  console.warn(
    `Best Hand: ${stats.bestHandWins} wins / ${stats.bestHandParticipations} participations`
  );

  return {
    numGames: stats.numGames,
    winRate: Math.round(winRate * 10) / 10, // Round to 1 decimal
    avgPosition: Math.round(avgPosition * 10) / 10, // Round to 1 decimal
    totalWinnings: totalEarnings,
    totalCosts,
    profitLoss,
    wins: stats.wins,
    bestHandParticipations: stats.bestHandParticipations,
    bestHandWins: stats.bestHandWins,
    bestHandWinnings: stats.bestHandWinnings,
    bestHandCosts: stats.bestHandCosts,
  };
};

/**
 * Format currency for display
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount) => {
  if (typeof amount !== 'number') return '$0';
  return `$${amount.toFixed(0)}`;
};

/**
 * Get color class for profit/loss display
 * @param {number} amount - P&L amount
 * @returns {string} Tailwind color class
 */
export const getProfitLossColor = (amount) => {
  if (amount > 0) return 'text-green-600';
  if (amount < 0) return 'text-red-600';
  return 'text-gray-600';
};
