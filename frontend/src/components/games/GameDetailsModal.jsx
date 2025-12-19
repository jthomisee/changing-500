import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { formatGameDateTime } from '../../utils/dateUtils';
import { formatCurrency, getProfitLossColor } from '../../utils/userStatsUtils';
import {
  sortGameResultsByPosition,
  calculateSideBetWinnings,
} from '../../utils/gameUtils';
import { apiCall } from '../../services/api';

const GameDetailsModal = ({ game, onClose, groupUsers = [] }) => {
  const [groupSideBets, setGroupSideBets] = useState([]);
  const [loadingSideBets, setLoadingSideBets] = useState(false);

  // Fetch group side bets when modal opens
  useEffect(() => {
    const fetchGroupSideBets = async () => {
      if (!game?.groupId) return;

      setLoadingSideBets(true);
      try {
        const data = await apiCall(`/groups/${game.groupId}/side-bets`, {
          method: 'GET',
        });
        setGroupSideBets(data.sideBets || []);
      } catch (error) {
        console.error('Failed to fetch group side bets:', error);
      } finally {
        setLoadingSideBets(false);
      }
    };

    fetchGroupSideBets();
  }, [game?.groupId]);

  if (!game) return null;

  // Extract side bet data from result (handles both legacy and new formats)
  const extractSideBetData = (result) => {
    const sideBetData = [];

    // Check new sideBets format first (preferred)
    if (result.sideBets && Array.isArray(result.sideBets)) {
      result.sideBets.forEach((sideBet) => {
        sideBetData.push({
          id: sideBet.sideBetId,
          name: sideBet.name,
          participated: Boolean(sideBet.participated),
          won: Boolean(sideBet.won),
          amount: sideBet.amount || 0,
          timesParticipated: Number.isInteger(sideBet.timesParticipated)
            ? sideBet.timesParticipated
            : sideBet.participated
              ? 1
              : 0,
        });
      });
    }
    // Fall back to legacy format if no new format found
    else if (
      result.bestHandParticipant !== undefined ||
      result.bestHandWinner !== undefined
    ) {
      sideBetData.push({
        id: 'legacy-best-hand',
        name: 'Best Hand',
        participated: Boolean(result.bestHandParticipant),
        won: Boolean(result.bestHandWinner),
        amount: 5, // Default best hand amount
      });
    }

    return sideBetData;
  };

  // Get user lookup for displaying names
  const getUserDisplayName = (userId) => {
    const user = groupUsers.find((u) => u.userId === userId);
    return user
      ? user.displayName || `${user.firstName} ${user.lastName}`
      : 'Unknown Player';
  };

  // Sort results by position for better display
  const sortedResults = game.results
    ? sortGameResultsByPosition(game.results)
    : [];

  // Get all unique side bets from this game
  const allGameSideBets = [];
  const sideBetMap = new Map();

  sortedResults.forEach((result) => {
    const resultSideBets = extractSideBetData(result);
    resultSideBets.forEach((sideBet) => {
      if (!sideBetMap.has(sideBet.id)) {
        sideBetMap.set(sideBet.id, sideBet);
        allGameSideBets.push(sideBet);
      }
    });
  });

  // Add any configured group side bets that weren't used in this game
  groupSideBets.forEach((groupSideBet) => {
    if (!sideBetMap.has(groupSideBet.id)) {
      allGameSideBets.push({
        id: groupSideBet.id,
        name: groupSideBet.name,
        amount: groupSideBet.amount,
        participated: false,
        won: false,
      });
    }
  });

  // Calculate totals
  const totalPot = sortedResults.reduce(
    (sum, result) => sum + (result.winnings || 0),
    0
  );
  const totalBuyins = sortedResults.length * (game.buyin || 20);
  const totalRebuys = sortedResults.reduce(
    (sum, result) => sum + (result.rebuys || 0),
    0
  );
  const totalRevenue = totalBuyins + totalRebuys * (game.buyin || 20);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Game Details</h2>
            <p className="text-gray-600">
              {formatGameDateTime(game)} • {game.groupName || 'Unknown Group'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Game Info */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-500">Location</div>
              <div className="font-medium text-gray-900">
                {game.location || 'Not specified'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Buy-in</div>
              <div className="font-medium text-gray-900">
                {formatCurrency(game.buyin || 20)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Players</div>
              <div className="font-medium text-gray-900">
                {sortedResults.length}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Total Pot</div>
              <div className="font-medium text-gray-900">
                {formatCurrency(totalPot)}
              </div>
            </div>
          </div>
        </div>

        {/* Player Results */}
        <div className="p-6 overflow-y-auto max-h-96">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Player Results
          </h3>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Position
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Winnings
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Buy-in
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rebuys
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Cost
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Profit/Loss
                  </th>
                  {allGameSideBets.map((sideBet) => (
                    <th
                      key={sideBet.id}
                      className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {sideBet.name} ${sideBet.amount}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedResults.map((result, index) => {
                  // Calculate side bet winnings using shared function
                  const sideBetWinnings = calculateSideBetWinnings(
                    result,
                    sortedResults,
                    groupSideBets
                  );

                  // Tournament logic
                  const totalCost =
                    (game.buyin || 20) +
                    (result.rebuys || 0) * (game.buyin || 20);
                  const profit =
                    (result.winnings || 0) - totalCost + sideBetWinnings;
                  const position = result.position || index + 1;

                  return (
                    <tr
                      key={result.userId || index}
                      className={`${
                        position === 1
                          ? 'bg-gradient-to-r from-yellow-50 to-yellow-25'
                          : position === 2
                            ? 'bg-gradient-to-r from-gray-50 to-gray-25'
                            : position === 3
                              ? 'bg-gradient-to-r from-orange-50 to-orange-25'
                              : ''
                      }`}
                    >
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            position === 1
                              ? 'bg-yellow-100 text-yellow-800'
                              : position === 2
                                ? 'bg-gray-100 text-gray-800'
                                : position === 3
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {position === 1
                            ? '🥇'
                            : position === 2
                              ? '🥈'
                              : position === 3
                                ? '🥉'
                                : ''}{' '}
                          #{position}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {getUserDisplayName(result.userId)}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-medium">
                        <span
                          className={
                            (result.winnings || 0) >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }
                        >
                          {formatCurrency(result.winnings || 0)}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {formatCurrency(game.buyin || 20)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                        {result.rebuys || 0}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {formatCurrency(totalCost)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-medium">
                        <span className={getProfitLossColor(profit)}>
                          {formatCurrency(profit)}
                        </span>
                      </td>
                      {allGameSideBets.map((sideBet) => {
                        const resultSideBets = extractSideBetData(result);
                        const playerSideBet = resultSideBets.find(
                          (rsb) => rsb.id === sideBet.id
                        );

                        return (
                          <td
                            key={sideBet.id}
                            className="px-4 py-4 whitespace-nowrap text-center"
                          >
                            <div className="flex flex-col gap-1 items-center">
                              {playerSideBet?.participated && (
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                                    Participant
                                  </span>
                                  {playerSideBet.timesParticipated > 1 && (
                                    <span className="text-xs text-gray-600">
                                      x{playerSideBet.timesParticipated}
                                    </span>
                                  )}
                                </div>
                              )}
                              {playerSideBet?.won && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                  Winner
                                </span>
                              )}
                              {!playerSideBet?.participated &&
                                !playerSideBet?.won && (
                                  <span className="text-gray-400 text-xs">
                                    -
                                  </span>
                                )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {sortedResults.map((result, index) => {
              // Calculate side bet winnings using shared function
              const sideBetWinnings = calculateSideBetWinnings(
                result,
                sortedResults,
                groupSideBets
              );

              // Tournament logic
              const totalCost =
                (game.buyin || 20) + (result.rebuys || 0) * (game.buyin || 20);
              const profit =
                (result.winnings || 0) - totalCost + sideBetWinnings;
              const position = result.position || index + 1;

              return (
                <div
                  key={result.userId || index}
                  className={`p-4 rounded-lg border ${
                    position === 1
                      ? 'bg-gradient-to-r from-yellow-50 to-yellow-25 border-yellow-200'
                      : position === 2
                        ? 'bg-gradient-to-r from-gray-50 to-gray-25 border-gray-200'
                        : position === 3
                          ? 'bg-gradient-to-r from-orange-50 to-orange-25 border-orange-200'
                          : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-medium text-gray-900">
                      {getUserDisplayName(result.userId)}
                    </div>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        position === 1
                          ? 'bg-yellow-100 text-yellow-800'
                          : position === 2
                            ? 'bg-gray-100 text-gray-800'
                            : position === 3
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {position === 1
                        ? '🥇'
                        : position === 2
                          ? '🥈'
                          : position === 3
                            ? '🥉'
                            : ''}{' '}
                      #{position}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-gray-500">Winnings</div>
                      <div
                        className={`font-medium ${(result.winnings || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {formatCurrency(result.winnings || 0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Total Cost</div>
                      <div className="font-medium text-gray-900">
                        {formatCurrency(totalCost)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Profit/Loss</div>
                      <div
                        className={`font-medium ${getProfitLossColor(profit)}`}
                      >
                        {formatCurrency(profit)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Rebuys</div>
                      <div className="font-medium text-gray-900">
                        {result.rebuys || 0}
                      </div>
                    </div>
                  </div>
                  {(() => {
                    const resultSideBets = extractSideBetData(result);
                    const hasSideBets = resultSideBets.some(
                      (sb) => sb.participated || sb.won
                    );

                    return hasSideBets ? (
                      <div className="mt-3">
                        <div className="text-gray-500 text-xs mb-2">
                          Side Bets
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {resultSideBets.map((sideBet) => (
                            <div
                              key={sideBet.id}
                              className="flex flex-wrap gap-1"
                            >
                              {sideBet.participated && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                                  {sideBet.name} Participant
                                </span>
                              )}
                              {sideBet.won && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                  {sideBet.name} Winner
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Game Summary
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Total Revenue</div>
              <div className="font-medium text-gray-900">
                {formatCurrency(totalRevenue)}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Total Paid Out</div>
              <div className="font-medium text-gray-900">
                {formatCurrency(totalPot)}
              </div>
            </div>
            <div>
              <div className="text-gray-500">House Take</div>
              <div className="font-medium text-gray-900">
                {formatCurrency(totalRevenue - totalPot)}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Total Rebuys</div>
              <div className="font-medium text-gray-900">{totalRebuys}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameDetailsModal;
