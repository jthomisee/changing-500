import { BEST_HAND_BET_AMOUNT } from '../constants/config';

/**
 * Export games to CSV with all player stats
 * @param {Array} games - Array of games to export
 * @param {Object} selectedGroup - Currently selected group
 * @param {Array} groupUsers - Array of group users for name lookup
 */
export const exportGamesToCSV = (games, selectedGroup, groupUsers = []) => {
  console.warn('\n=== CSV EXPORT ===');
  console.warn(`Exporting ${games?.length || 0} games`);
  console.warn('Game dates:', games?.map((g) => g.date).join(', '));

  if (!games || games.length === 0) {
    alert('No games to export');
    return;
  }

  // Create user lookup map
  const userLookup = {};
  groupUsers.forEach((user) => {
    userLookup[user.userId] = user;
  });

  // Build CSV rows
  const rows = [];

  // Header row
  rows.push([
    'Game Date',
    'Location',
    'Game Type',
    'Buy-in',
    'Player Name',
    'Position',
    'Tournament Winnings',
    'Rebuys',
    'Best Hand Participant',
    'Best Hand Winner',
    'Best Hand Winnings',
    'Total Winnings',
    'Total Costs',
    'Net P&L',
  ]);

  // Sort games by date (newest first)
  const sortedGames = [...games].sort((a, b) => {
    return new Date(b.date) - new Date(a.date);
  });

  // Process each game
  sortedGames.forEach((game) => {
    const gameBuyin = game.buyin || 20;
    const results = game.results || [];

    // Calculate best hand pot for this game
    const bestHandParticipants = results.filter((r) => {
      if (r.bestHandParticipant !== undefined) {
        return Boolean(r.bestHandParticipant);
      }
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

    const bestHandWinners = results.filter((r) => {
      if (r.bestHandWinner !== undefined) {
        return Boolean(r.bestHandWinner);
      }
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

    // Sort results by position
    const sortedResults = [...results].sort((a, b) => {
      return (a.position || 999) - (b.position || 999);
    });

    // Add row for each player
    sortedResults.forEach((result) => {
      const user = userLookup[result.userId];
      const playerName = user
        ? `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
          user.displayName ||
          user.email ||
          'Unknown'
        : `Unknown (${result.userId?.slice(-8) || 'N/A'})`;

      const tournamentWinnings = result.winnings || 0;
      const rebuys = result.rebuys || 0;
      const totalCosts = gameBuyin + rebuys * gameBuyin;

      // Check best hand participation and wins
      let bestHandParticipant = false;
      let bestHandWinner = false;

      if (
        result.bestHandParticipant !== undefined ||
        result.bestHandWinner !== undefined
      ) {
        bestHandParticipant = Boolean(result.bestHandParticipant);
        bestHandWinner = Boolean(result.bestHandWinner);
      } else if (result.sideBets && Array.isArray(result.sideBets)) {
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

      const bestHandCost = bestHandParticipant ? BEST_HAND_BET_AMOUNT : 0;
      const bestHandWinnings = bestHandWinner ? bestHandWinningsPerWinner : 0;
      const totalWinnings = tournamentWinnings + bestHandWinnings;
      const totalCostsWithBestHand = totalCosts + bestHandCost;
      const netPL = totalWinnings - totalCostsWithBestHand;

      rows.push([
        game.date,
        game.location || '-',
        game.gameType || 'Tournament',
        `$${gameBuyin}`,
        playerName,
        result.position || '-',
        `$${tournamentWinnings.toFixed(2)}`,
        rebuys,
        bestHandParticipant ? 'Yes' : 'No',
        bestHandWinner ? 'Yes' : 'No',
        `$${bestHandWinnings.toFixed(2)}`,
        `$${totalWinnings.toFixed(2)}`,
        `$${totalCostsWithBestHand.toFixed(2)}`,
        `$${netPL.toFixed(2)}`,
      ]);
    });
  });

  // Convert to CSV string
  const csvContent = rows
    .map((row) =>
      row
        .map((cell) => {
          // Escape quotes and wrap in quotes if contains comma or quote
          const cellStr = String(cell);
          if (cellStr.includes(',') || cellStr.includes('"')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        })
        .join(',')
    )
    .join('\n');

  // Create download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  const fileName = selectedGroup
    ? `${selectedGroup.name.replace(/[^a-z0-9]/gi, '_')}_games_export_${new Date().toISOString().split('T')[0]}.csv`
    : `poker_games_export_${new Date().toISOString().split('T')[0]}.csv`;

  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
