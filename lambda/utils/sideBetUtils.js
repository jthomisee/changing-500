/**
 * Utility functions for handling side bets in games
 */

/**
 * Migrate legacy "Best Hand" side bet data to new configurable format
 * @param {Object} result - Game result object
 * @param {Array} groupSideBets - Array of configured side bets for the group
 * @returns {Object} Updated result with sideBets array
 */
function migrateLegacySideBets(result, groupSideBets = []) {
  // If already has sideBets array, return as-is
  if (result.sideBets && Array.isArray(result.sideBets)) {
    return result;
  }

  const sideBets = [];

  // Check for legacy "Best Hand" data
  if (result.bestHandParticipant !== undefined || result.bestHandWinner !== undefined) {
    // Find "Best Hand" side bet in group configuration
    let bestHandSideBet = groupSideBets.find(bet => 
      bet.name.toLowerCase() === 'best hand' && bet.isActive
    );

    // If not found, create a default one for backward compatibility
    if (!bestHandSideBet) {
      bestHandSideBet = {
        id: 'legacy-best-hand',
        name: 'Best Hand',
        description: 'Legacy best hand side bet',
        amount: 5, // Default amount from config
        isActive: true
      };
    }

    sideBets.push({
      sideBetId: bestHandSideBet.id,
      name: bestHandSideBet.name,
      amount: bestHandSideBet.amount,
      participated: Boolean(result.bestHandParticipant),
      won: Boolean(result.bestHandWinner),
      // timesParticipated records how many times the player participated in this side bet
      // (independent of rebuys). Default to 1 if participated, otherwise 0.
      timesParticipated: result.bestHandParticipant ? 1 : 0
    });
  }

  // Return updated result without legacy fields
  const updatedResult = { ...result };
  delete updatedResult.bestHandParticipant;
  delete updatedResult.bestHandWinner;
  updatedResult.sideBets = sideBets;

  return updatedResult;
}

/**
 * Initialize side bets for a game result based on selected side bets
 * @param {Array} selectedSideBetIds - Array of side bet IDs selected for the game
 * @param {Array} groupSideBets - Array of all configured side bets for the group
 * @returns {Array} Array of initialized side bet objects for a player
 */
function initializeSideBetsForPlayer(selectedSideBetIds = [], groupSideBets = []) {
  return selectedSideBetIds.map(sideBetId => {
    const sideBet = groupSideBets.find(bet => bet.id === sideBetId && bet.isActive);
    if (!sideBet) {
      console.warn(`Side bet with ID ${sideBetId} not found or inactive`);
      return null;
    }

    return {
      sideBetId: sideBet.id,
      name: sideBet.name,
      amount: sideBet.amount,
      participated: false,
      won: false,
      // how many times this player participated in this side bet (0 = not participated)
      timesParticipated: 0
    };
  }).filter(Boolean); // Remove null entries
}

/**
 * Validate side bet data in game results
 * @param {Array} results - Array of game results
 * @param {Array} groupSideBets - Array of configured side bets for the group
 * @returns {Array} Array of validation errors
 */
function validateSideBets(results, groupSideBets = []) {
  const errors = [];

  results.forEach((result, playerIndex) => {
    if (!result.sideBets || !Array.isArray(result.sideBets)) {
      return; // Skip if no side bets
    }

    result.sideBets.forEach((sideBet, betIndex) => {
      // Normalize timesParticipated fallback
      const tp = Number.isInteger(sideBet.timesParticipated) ? sideBet.timesParticipated : (sideBet.participated ? 1 : 0);

      // Check timesParticipated validity
      if (!Number.isInteger(tp) || tp < 0) {
        errors.push(`Player ${playerIndex + 1}: ${sideBet.name} timesParticipated must be an integer >= 0`);
      }

      // Check if side bet winner also participated at least once
      if (sideBet.won && tp <= 0) {
        errors.push(`Player ${playerIndex + 1}: ${sideBet.name} winner must have timesParticipated > 0`);
      }

      // Verify side bet exists in group configuration
      const configuredSideBet = groupSideBets.find(bet => bet.id === sideBet.sideBetId);
      if (!configuredSideBet) {
        errors.push(`Player ${playerIndex + 1}: Side bet "${sideBet.name}" is not configured for this group`);
      } else if (!configuredSideBet.isActive) {
        errors.push(`Player ${playerIndex + 1}: Side bet "${sideBet.name}" is not active`);
      }
    });
  });

  return errors;
}

/**
 * Calculate side bet statistics for a player across multiple games
 * @param {Array} games - Array of games with results
 * @param {string} userId - User ID to calculate stats for
 * @returns {Object} Side bet statistics
 */
function calculateSideBetStats(games, userId) {
  const stats = {
    totalParticipations: 0,
    totalWins: 0,
    totalCosts: 0,
    totalWinnings: 0,
    byBetType: {} // Stats grouped by side bet name
  };

  games.forEach(game => {
    const userResult = game.results?.find(r => r.userId === userId);
    if (!userResult || !userResult.sideBets) return;

    userResult.sideBets.forEach(sideBet => {
      // Initialize bet type stats if not exists
      if (!stats.byBetType[sideBet.name]) {
        stats.byBetType[sideBet.name] = {
          participations: 0,
          wins: 0,
          costs: 0,
          winnings: 0
        };
      }

      const betStats = stats.byBetType[sideBet.name];

      // Resolve this player's timesParticipated (fallback to participated boolean)
      const playerTP = Number.isInteger(sideBet.timesParticipated) ? sideBet.timesParticipated : (sideBet.participated ? 1 : 0);

      if (playerTP > 0) {
        stats.totalParticipations += playerTP;
        betStats.participations += playerTP;
        const cost = sideBet.amount * playerTP;
        stats.totalCosts += cost;
        betStats.costs += cost;
      }

      if (sideBet.won) {
        stats.totalWins++;
        betStats.wins++;

        // Calculate weighted participants and winners for this game
        let participantsWeight = 0;
        let winnersWeight = 0;

        game.results.forEach(r => {
          const sb = r.sideBets?.find(s => s.sideBetId === sideBet.sideBetId);
          if (!sb) return;
          const tp = Number.isInteger(sb.timesParticipated) ? sb.timesParticipated : (sb.participated ? 1 : 0);
          if (tp > 0) participantsWeight += tp;
          if (sb.won && tp > 0) winnersWeight += tp;
        });

        if (winnersWeight > 0 && participantsWeight > 0) {
          const totalPot = participantsWeight * sideBet.amount;
          // Proportional split by winner weight
          const winningsForThisPlayer = (playerTP / winnersWeight) * totalPot;
          stats.totalWinnings += winningsForThisPlayer;
          betStats.winnings += winningsForThisPlayer;
        }
      }
    });
  });

  return stats;
}

module.exports = {
  migrateLegacySideBets,
  initializeSideBetsForPlayer,
  validateSideBets,
  calculateSideBetStats
};
