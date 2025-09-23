import React, { useState, useMemo } from 'react';
import { formatGameDateTime } from '../../utils/dateUtils';
import { formatCurrency, getProfitLossColor } from '../../utils/userStatsUtils';
import SortableHeader from '../common/SortableHeader.jsx';
import EmptyState from '../common/EmptyState.jsx';

const GameHistoryTable = ({ userGames = [], loading = false, onGameClick }) => {
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');

  // Sort the games based on current sort settings
  const sortedGames = useMemo(() => {
    if (!userGames.length) return [];

    return [...userGames].sort((a, b) => {
      let aValue, bValue;

      switch (sortField) {
        case 'date':
          aValue = new Date(a.date);
          bValue = new Date(b.date);
          break;
        case 'group':
          aValue = a.groupName.toLowerCase();
          bValue = b.groupName.toLowerCase();
          break;
        case 'position':
          aValue = a.userPosition;
          bValue = b.userPosition;
          break;
        case 'winnings':
          aValue = a.userWinnings;
          bValue = b.userWinnings;
          break;
        case 'buyin':
          aValue = a.userTotalCost || a.buyin + a.userRebuys * a.buyin;
          bValue = b.userTotalCost || b.buyin + b.userRebuys * b.buyin;
          break;
        case 'profit':
          aValue =
            a.userProfitLoss !== undefined
              ? a.userProfitLoss
              : a.userWinnings - (a.buyin + a.userRebuys * a.buyin);
          bValue =
            b.userProfitLoss !== undefined
              ? b.userProfitLoss
              : b.userWinnings - (b.buyin + b.userRebuys * b.buyin);
          break;
        default:
          aValue = a[sortField];
          bValue = b[sortField];
      }

      if (aValue === bValue) return 0;

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : 1;
      } else {
        return aValue > bValue ? -1 : 1;
      }
    });
  }, [userGames, sortField, sortDirection]);

  const handleSort = (field) => {
    if (field === sortField) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading game history...</span>
        </div>
      </div>
    );
  }

  if (!userGames.length) {
    return (
      <EmptyState
        title="No Game History"
        description="You haven't played any games yet. Join a group and start playing!"
        className="bg-white rounded-lg border border-gray-200"
      />
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          Game History ({userGames.length} games)
        </h3>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <SortableHeader
                field="date"
                align="text-left"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
              >
                Date
              </SortableHeader>
              <SortableHeader
                field="group"
                align="text-left"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
              >
                Group
              </SortableHeader>
              <SortableHeader
                field="position"
                align="text-center"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
              >
                Position
              </SortableHeader>
              <SortableHeader
                field="winnings"
                align="text-right"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
              >
                Winnings
              </SortableHeader>
              <SortableHeader
                field="buyin"
                align="text-right"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
              >
                Buy-in + Rebuys
              </SortableHeader>
              <SortableHeader
                field="profit"
                align="text-right"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
              >
                Profit/Loss
              </SortableHeader>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedGames.map((game) => {
              const totalCost =
                game.userTotalCost || game.buyin + game.userRebuys * game.buyin;
              const profit =
                game.userProfitLoss !== undefined
                  ? game.userProfitLoss
                  : game.userWinnings - totalCost;

              return (
                <tr
                  key={`${game.id}-${game.groupId}`}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => onGameClick && onGameClick(game)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatGameDateTime(game)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {game.groupName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        game.userPosition === 1
                          ? 'bg-yellow-100 text-yellow-800'
                          : game.userPosition === 2
                            ? 'bg-gray-100 text-gray-800'
                            : game.userPosition === 3
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {game.userPosition === 1
                        ? '🥇'
                        : game.userPosition === 2
                          ? '🥈'
                          : game.userPosition === 3
                            ? '🥉'
                            : ''}{' '}
                      #{game.userPosition}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                    <span
                      className={
                        game.userWinnings >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }
                    >
                      {formatCurrency(game.userWinnings)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {formatCurrency(totalCost)}
                    {game.userRebuys > 0 && (
                      <span className="ml-1 text-xs text-gray-500">
                        (+{game.userRebuys} rebuy
                        {game.userRebuys > 1 ? 's' : ''})
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                    <span className={getProfitLossColor(profit)}>
                      {formatCurrency(profit)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden divide-y divide-gray-200">
        {sortedGames.map((game) => {
          const totalCost =
            game.userTotalCost || game.buyin + game.userRebuys * game.buyin;
          const profit =
            game.userProfitLoss !== undefined
              ? game.userProfitLoss
              : game.userWinnings - totalCost;

          return (
            <div
              key={`${game.id}-${game.groupId}`}
              className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => onGameClick && onGameClick(game)}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {game.groupName}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatGameDateTime(game)}
                  </div>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    game.userPosition === 1
                      ? 'bg-yellow-100 text-yellow-800'
                      : game.userPosition === 2
                        ? 'bg-gray-100 text-gray-800'
                        : game.userPosition === 3
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-red-100 text-red-800'
                  }`}
                >
                  {game.userPosition === 1
                    ? '🥇'
                    : game.userPosition === 2
                      ? '🥈'
                      : game.userPosition === 3
                        ? '🥉'
                        : ''}{' '}
                  #{game.userPosition}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-gray-500">Winnings</div>
                  <div
                    className={`font-medium ${game.userWinnings >= 0 ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {formatCurrency(game.userWinnings)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Cost</div>
                  <div className="font-medium text-gray-900">
                    {formatCurrency(totalCost)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">P/L</div>
                  <div className={`font-medium ${getProfitLossColor(profit)}`}>
                    {formatCurrency(profit)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GameHistoryTable;
