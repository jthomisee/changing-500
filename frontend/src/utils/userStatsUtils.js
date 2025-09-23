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

      // Calculate cash game specific values
      let userProfitLoss = 0;
      let actualWinnings = userResult.winnings || 0;
      let totalCost =
        (game.buyin || 20) + (userResult.rebuys || 0) * (game.buyin || 20);

      if (game.gameType === 'cash') {
        // For cash games, profit/loss is cash-out minus buy-in (no rebuys)
        const cashOut = userResult.cashOutAmount || 0;
        const buyIn = userResult.buyInAmount || 0;
        totalCost = buyIn;
        actualWinnings = cashOut;
        userProfitLoss = cashOut - totalCost + sideBetWinnings;
      } else {
        // For tournament games, use existing logic
        userProfitLoss = actualWinnings - totalCost + sideBetWinnings;
      }

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
        userPoints: calculatePoints(game.results, userResult, game.gameType),
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

  userGames.forEach((game) => {
    const { userResult, buyin } = game;

    // Use pre-calculated values from getUserGamesAcrossGroups
    stats.totalWinnings += game.userWinnings || 0;
    stats.totalBuyins += game.userTotalCost || 0;

    // Only count positions for tournament games
    if (game.gameType !== 'cash' && userResult.position) {
      stats.totalPositions += userResult.position;
    }

    // Count wins differently for cash vs tournament games
    if (game.gameType === 'cash') {
      // For cash games, consider it a "win" if profit is positive
      if (game.userProfitLoss > 0) {
        stats.wins++;
      }
    } else {
      // For tournament games, count 1st or 2nd place as wins
      if (userResult.position === 1 || userResult.position === 2) {
        stats.wins++;
      }
    }

    // Best hand tracking
    if (userResult.bestHandParticipant) {
      stats.bestHandParticipations++;
      stats.bestHandCosts += BEST_HAND_BET_AMOUNT;
    }

    if (userResult.bestHandWinner) {
      stats.bestHandWins++;
      // Calculate best hand winnings for this game
      const bestHandParticipants = game.results.filter(
        (r) => r.bestHandParticipant
      ).length;
      const bestHandWinners = game.results.filter(
        (r) => r.bestHandWinner
      ).length;
      const totalBestHandPot = bestHandParticipants * BEST_HAND_BET_AMOUNT;
      const winningsPerWinner =
        bestHandWinners > 0 ? totalBestHandPot / bestHandWinners : 0;
      stats.bestHandWinnings += winningsPerWinner;
    }
  });

  // Calculate derived stats
  const winRate = stats.numGames > 0 ? (stats.wins / stats.numGames) * 100 : 0;

  // Only calculate average position for tournament games
  const tournamentGames = userGames.filter((game) => game.gameType !== 'cash');
  const avgPosition =
    tournamentGames.length > 0
      ? stats.totalPositions / tournamentGames.length
      : 0;

  const totalCosts = stats.totalBuyins + stats.bestHandCosts;
  const totalEarnings = stats.totalWinnings + stats.bestHandWinnings;
  const profitLoss = totalEarnings - totalCosts;

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
