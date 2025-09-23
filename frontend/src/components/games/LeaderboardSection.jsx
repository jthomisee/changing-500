import React from 'react';
import { TrendingUp, Trophy, ChevronDown } from 'lucide-react';
import SortableHeader from '../common/SortableHeader.jsx';
import {
  TableLoadingState,
  CardLoadingState,
} from '../common/LoadingSpinner.jsx';
import { NoStandingsEmptyState } from '../common/EmptyState.jsx';
import { useGameContext } from '../../context/GameContext.jsx';

const LeaderboardSection = ({
  isMobile,
  standings,
  standingsLoading,
  sortField,
  sortDirection,
  handleSort,
  expandedRows,
  toggleRowExpanded,
  gameType = 'tournament', // 'tournament' or 'cash'
}) => {
  const allExpanded =
    standings.length > 0 &&
    standings.every((player) => expandedRows.has(player.userId));

  const handleExpandCollapseAll = () => {
    if (allExpanded) {
      // Collapse all
      standings.forEach((player) => {
        if (expandedRows.has(player.userId)) {
          toggleRowExpanded(player.userId);
        }
      });
    } else {
      // Expand all
      standings.forEach((player) => {
        if (!expandedRows.has(player.userId)) {
          toggleRowExpanded(player.userId);
        }
      });
    }
  };
  const { selectedGroup } = useGameContext();
  const getRowColorClass = (player) => {
    if (player.rank === 1)
      return 'bg-gradient-to-r from-yellow-100 to-yellow-50 hover:from-yellow-200 hover:to-yellow-100';
    if (player.rank === 2)
      return 'bg-gradient-to-r from-slate-200 to-slate-100 hover:from-slate-300 hover:to-slate-200';
    return 'hover:bg-gray-50';
  };

  const getStickyBgClass = (player) => {
    if (player.rank === 1)
      return 'bg-gradient-to-r from-yellow-100 to-yellow-50';
    if (player.rank === 2)
      return 'bg-gradient-to-r from-slate-200 to-slate-100';
    return 'bg-white';
  };

  const getCardColorClass = (player) => {
    if (player.rank === 1)
      return 'bg-gradient-to-r from-yellow-100 to-yellow-50 border-yellow-200';
    if (player.rank === 2)
      return 'bg-gradient-to-r from-slate-200 to-slate-100 border-slate-300';
    return 'bg-white border-gray-200';
  };

  if (standingsLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg mb-8">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-blue-600" />
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">
                  {gameType === 'cash' ? 'Cash Game' : 'Tournament'} Leaderboard
                </h2>
                {gameType === 'tournament' && (
                  <p className="text-sm text-gray-600 mt-1">
                    Points = Players - Position (tied positions split points
                    equally)
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        {isMobile ? (
          <CardLoadingState message="Loading standings..." />
        ) : (
          <table className="min-w-full">
            <tbody>
              <TableLoadingState message="Loading standings..." colSpan={10} />
            </tbody>
          </table>
        )}
      </div>
    );
  }

  if (standings.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg mb-8">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-blue-600" />
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">
                  {gameType === 'cash' ? 'Cash Game' : 'Tournament'} Leaderboard
                </h2>
                {gameType === 'tournament' && (
                  <p className="text-sm text-gray-600 mt-1">
                    Points = Players - Position (tied positions split points
                    equally)
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        <NoStandingsEmptyState groupName={selectedGroup?.name} />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg mb-8">
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">
                {gameType === 'cash' ? 'Cash Game' : 'Tournament'} Leaderboard
              </h2>
              {gameType === 'tournament' && (
                <p className="text-sm text-gray-600 mt-1">
                  Points = Players - Position (tied positions split points
                  equally)
                </p>
              )}
            </div>
          </div>
          {isMobile && standings.length > 0 && (
            <button
              onClick={handleExpandCollapseAll}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {allExpanded ? 'Collapse All' : 'Expand All'}
            </button>
          )}
        </div>
      </div>

      {/* Desktop Table View */}
      {!isMobile && (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <SortableHeader
                  field="rank"
                  sticky={true}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                >
                  Rank
                </SortableHeader>
                <SortableHeader
                  field="player"
                  sticky={true}
                  stickyLeft="left-12"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                >
                  Player
                </SortableHeader>
                {gameType !== 'cash' && (
                  <SortableHeader
                    field="points"
                    align="text-center"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    Points
                  </SortableHeader>
                )}
                <SortableHeader
                  field="games"
                  align="text-center"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                >
                  Games
                </SortableHeader>
                <SortableHeader
                  field="winRate"
                  align="text-center"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                >
                  {gameType === 'cash' ? 'Profit Rate' : 'Win Rate'}
                </SortableHeader>
                {gameType !== 'cash' && (
                  <SortableHeader
                    field="avgPosition"
                    align="text-center"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    Avg Pos
                  </SortableHeader>
                )}
                <SortableHeader
                  field="currentStreak"
                  align="text-center"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                >
                  Streak
                </SortableHeader>
                <SortableHeader
                  field="bestHandWinCount"
                  align="text-center"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                >
                  Best Hand Wins
                </SortableHeader>
                <SortableHeader
                  field="winnings"
                  align="text-center"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                >
                  Total Winnings
                </SortableHeader>
                <SortableHeader
                  field="netWinnings"
                  align="text-center"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                >
                  P&L
                </SortableHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {standings.map((player) => (
                <tr key={player.player} className={getRowColorClass(player)}>
                  <td
                    className={`px-4 py-3 text-left font-bold sticky left-0 z-10 shadow-sm border-r ${getStickyBgClass(player)}`}
                  >
                    <div className="flex items-center gap-1">
                      {player.rank === 1 && (
                        <Trophy className="w-4 h-4 text-yellow-600" />
                      )}
                      {player.rank}
                    </div>
                  </td>
                  <td
                    className={`px-4 py-3 text-left font-medium sticky left-12 z-10 shadow-sm border-r ${getStickyBgClass(player)}`}
                  >
                    <div className="flex items-center gap-1">
                      {player.player}
                    </div>
                  </td>
                  {gameType !== 'cash' && (
                    <td className="px-4 py-3 text-center font-semibold text-blue-600">
                      {player.points}
                    </td>
                  )}
                  <td className="px-4 py-3 text-center">{player.games}</td>
                  <td className="px-4 py-3 text-center">
                    {player.winRate.toFixed(1)}%
                    <div className="text-xs text-gray-500">
                      {gameType === 'cash'
                        ? `${player.wins} profitable games`
                        : `${player.wins}W - ${player.games - player.wins}L`}
                    </div>
                  </td>
                  {gameType !== 'cash' && (
                    <td className="px-4 py-3 text-center">
                      {player.avgPosition.toFixed(1)}
                    </td>
                  )}
                  <td className="px-4 py-3 text-center">
                    {player.streakType === 'win' ? (
                      <span className="text-green-600 font-semibold">
                        W{player.currentStreak}
                      </span>
                    ) : player.streakType === 'loss' ? (
                      <span className="text-red-600 font-semibold">
                        L{player.currentStreak}
                      </span>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="font-semibold text-purple-600">
                      {player.bestHandWinCount}
                    </div>
                    <div className="text-xs text-gray-500">
                      Participated: {player.bestHandParticipationCount} times
                    </div>
                  </td>
                  <td
                    className={`px-4 py-3 text-center font-semibold ${player.winnings >= 0 ? 'text-green-600' : 'text-red-600'}`}
                  >
                    ${player.winnings.toFixed(2)}
                  </td>
                  <td
                    className={`px-4 py-3 text-center font-semibold ${player.netWinnings >= 0 ? 'text-green-600' : 'text-red-600'}`}
                  >
                    ${player.netWinnings.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile Card View */}
      {isMobile && (
        <div>
          {standings.map((player) => {
            const isExpanded = expandedRows.has(player.userId);

            return (
              <div
                key={player.player}
                className={`border-b last:border-b-0 ${getCardColorClass(player)}`}
              >
                <div
                  className="p-4 cursor-pointer hover:bg-opacity-80 transition-colors"
                  onClick={() => toggleRowExpanded(player.userId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex items-center gap-1">
                        {player.rank === 1 && (
                          <Trophy className="w-5 h-5 text-yellow-600" />
                        )}
                        <span className="font-bold text-lg">
                          #{player.rank}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">
                          {player.player}
                        </div>
                        <div className="text-sm text-gray-600">
                          {player.games} games
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {gameType !== 'cash' && (
                        <div className="text-right">
                          <div className="font-semibold text-blue-600 text-lg">
                            {player.points}
                          </div>
                          <div className="text-xs text-gray-500">points</div>
                        </div>
                      )}
                      <ChevronDown
                        className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-200 bg-white bg-opacity-50">
                    <div className="grid grid-cols-2 gap-4 pt-4">
                      <div className="text-center">
                        <div className="text-sm text-gray-500">
                          {gameType === 'cash' ? 'Profit Rate' : 'Win Rate'}
                        </div>
                        <div className="font-semibold">
                          {player.winRate.toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-400">
                          {gameType === 'cash'
                            ? `${player.wins} profitable`
                            : `${player.wins}W - ${player.games - player.wins}L`}
                        </div>
                      </div>
                      {gameType !== 'cash' && (
                        <div className="text-center">
                          <div className="text-sm text-gray-500">
                            Avg Position
                          </div>
                          <div className="font-semibold">
                            {player.avgPosition.toFixed(1)}
                          </div>
                        </div>
                      )}
                      <div className="text-center">
                        <div className="text-sm text-gray-500">
                          Current Streak
                        </div>
                        {player.streakType === 'win' ? (
                          <div className="text-green-600 font-semibold">
                            W{player.currentStreak}
                          </div>
                        ) : player.streakType === 'loss' ? (
                          <div className="text-red-600 font-semibold">
                            L{player.currentStreak}
                          </div>
                        ) : (
                          <div className="text-gray-500">-</div>
                        )}
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-gray-500">
                          Best Hand Wins
                        </div>
                        <div className="font-semibold text-purple-600">
                          {player.bestHandWinCount}
                        </div>
                        <div className="text-xs text-gray-400">
                          of {player.bestHandParticipationCount}
                        </div>
                      </div>
                      <div className="text-center col-span-1">
                        <div className="text-sm text-gray-500">
                          Total Winnings
                        </div>
                        <div
                          className={`font-semibold ${player.winnings >= 0 ? 'text-green-600' : 'text-red-600'}`}
                        >
                          ${player.winnings.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-center col-span-1">
                        <div className="text-sm text-gray-500">P&L</div>
                        <div
                          className={`font-semibold ${player.netWinnings >= 0 ? 'text-green-600' : 'text-red-600'}`}
                        >
                          ${player.netWinnings.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LeaderboardSection;
