/**
 * Payout calculation utilities for tournament games
 */

/**
 * Calculate payouts based on payout structure and game data
 * @param {Object} game - Game object with payoutStructure, buyin, houseTake, etc.
 * @param {Array} results - Array of player results with positions
 * @returns {Object} Calculated payouts and house take
 */
function calculatePayouts(game, results) {
  // Unified payout calculation for all game types

  const buyin = game.buyin || 20;
  const payoutStructure = game.payoutStructure || [];
  const houseTake = game.houseTake || 0;
  const houseTakeType = game.houseTakeType || 'fixed';

  // Calculate total pot
  const totalBuyins = results.reduce((sum, result) => {
    return sum + buyin + (result.rebuys || 0) * buyin;
  }, 0);

  // Calculate house take
  let houseTakeAmount = 0;
  if (houseTakeType === 'percentage') {
    houseTakeAmount = (totalBuyins * houseTake) / 100;
  } else {
    houseTakeAmount = houseTake;
  }

  // Available pot after house take
  const availablePot = totalBuyins - houseTakeAmount;

  // Group players by position to handle ties
  const positionGroups = {};
  results.forEach(result => {
    if (result.position) {
      if (!positionGroups[result.position]) {
        positionGroups[result.position] = [];
      }
      positionGroups[result.position].push(result);
    }
  });

  // Calculate payouts for each position
  const playerPayouts = {};
  let totalPaidOut = 0;
  const fixedPayouts = {}; // Store fixed amounts for remaining calculation

  // First pass: calculate fixed payouts (buyin_return, fixed amounts)
  payoutStructure.forEach(payout => {
    const position = payout.position;
    const playersAtPosition = positionGroups[position] || [];

    if (playersAtPosition.length === 0) return;

    let amountPerPlayer = 0;

    switch (payout.type) {
      case 'buyin_return':
        amountPerPlayer = buyin;
        break;
      case 'fixed':
        amountPerPlayer = payout.value || 0;
        break;
      case 'percentage':
        amountPerPlayer = (availablePot * (payout.value || 0)) / 100;
        break;
      case 'remaining':
        // Will be calculated in second pass
        break;
    }

    if (payout.type !== 'remaining') {
      const totalForPosition = amountPerPlayer * playersAtPosition.length;
      totalPaidOut += totalForPosition;
      fixedPayouts[position] = totalForPosition;

      // Distribute among tied players
      playersAtPosition.forEach(player => {
        playerPayouts[player.userId] = amountPerPlayer;
      });
    }
  });

  // Second pass: calculate remaining payouts
  const remainingPot = availablePot - totalPaidOut;

  payoutStructure.forEach(payout => {
    if (payout.type === 'remaining') {
      const position = payout.position;
      const playersAtPosition = positionGroups[position] || [];

      if (playersAtPosition.length > 0 && remainingPot > 0) {
        const amountPerPlayer = remainingPot / playersAtPosition.length;

        playersAtPosition.forEach(player => {
          playerPayouts[player.userId] = (playerPayouts[player.userId] || 0) + amountPerPlayer;
        });

        totalPaidOut += remainingPot;
      }
    }
  });

  return {
    playerPayouts,
    totalPayout: totalPaidOut,
    houseTake: houseTakeAmount,
    remainingPot: availablePot - totalPaidOut,
    totalBuyins,
    availablePot
  };
}

/**
 * Clean and normalize payout structure by removing/setting values for types that don't need them
 * @param {Array} payoutStructure - Array of payout rules
 * @returns {Array} Cleaned payout structure
 */
function cleanPayoutStructure(payoutStructure) {
  if (!Array.isArray(payoutStructure)) {
    return payoutStructure;
  }

  return payoutStructure.map(payout => {
    const cleaned = { ...payout };

    // Remove or zero out value for types that don't need it
    if (payout.type === 'buyin_return' || payout.type === 'remaining') {
      cleaned.value = 0; // Store as 0 instead of removing to maintain data structure consistency
    }

    return cleaned;
  });
}

/**
 * Validate payout structure
 * @param {Array} payoutStructure - Array of payout rules
 * @returns {Array} Array of validation errors
 */
function validatePayoutStructure(payoutStructure) {
  const errors = [];

  if (!Array.isArray(payoutStructure)) {
    errors.push('Payout structure must be an array');
    return errors;
  }

  const positions = new Set();
  let totalPercentage = 0;
  let hasRemaining = false;

  payoutStructure.forEach((payout, index) => {
    // Check for required fields
    if (!payout.position || !payout.type) {
      errors.push(`Payout rule ${index + 1}: position and type are required`);
      return;
    }

    // Check for duplicate positions
    if (positions.has(payout.position)) {
      errors.push(`Payout rule ${index + 1}: duplicate position ${payout.position}`);
    }
    positions.add(payout.position);

    // Validate payout types
    const validTypes = ['percentage', 'fixed', 'buyin_return', 'remaining'];
    if (!validTypes.includes(payout.type)) {
      errors.push(`Payout rule ${index + 1}: invalid type '${payout.type}'`);
    }

    // Validate percentage values
    if (payout.type === 'percentage') {
      if (typeof payout.value !== 'number' || payout.value < 0 || payout.value > 100) {
        errors.push(`Payout rule ${index + 1}: percentage must be between 0 and 100`);
      } else {
        totalPercentage += payout.value;
      }
    }

    // Validate fixed amounts
    if (payout.type === 'fixed') {
      if (typeof payout.value !== 'number' || payout.value < 0) {
        errors.push(`Payout rule ${index + 1}: fixed amount must be a positive number`);
      }
    }

    // Check for remaining type
    if (payout.type === 'remaining') {
      if (hasRemaining) {
        errors.push(`Only one 'remaining' payout rule is allowed`);
      }
      hasRemaining = true;
    }
  });

  // Check if percentages exceed 100% (only if no remaining payout)
  if (!hasRemaining && totalPercentage > 100) {
    errors.push(`Total percentage payouts (${totalPercentage}%) exceed 100%`);
  }

  return errors;
}

module.exports = {
  calculatePayouts,
  validatePayoutStructure,
  cleanPayoutStructure
};