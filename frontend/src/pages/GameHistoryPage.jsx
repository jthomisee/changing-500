import React, { useMemo } from 'react';
import { Calendar, Target, TrendingUp, DollarSign, Award } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useGroupsContext } from '../context/GroupsContext.jsx';
import { useAllUserGames } from '../hooks/useAllUserGames';
import {
  calculateUserCombinedStats,
  formatCurrency,
  getProfitLossColor,
} from '../utils/userStatsUtils';
import StatsCard from '../components/common/StatsCard.jsx';
import GameHistoryTable from '../components/games/GameHistoryTable.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import { useScrollToTop } from '../hooks/useScrollToTop';

const GameHistoryPage = () => {
  useScrollToTop();

  const { currentUser } = useAuth();
  const { groups, loadingGroups: groupsLoading } = useGroupsContext();

  const {
    allGames: userGames,
    loading: gamesLoading,
    error: gamesError,
  } = useAllUserGames(groups, currentUser);

  // Filter to only completed games and calculate combined statistics
  const { completedUserGames, stats } = useMemo(() => {
    if (!userGames.length) {
      return {
        completedUserGames: [],
        stats: {
          numGames: 0,
          winRate: 0,
          avgPosition: 0,
          totalWinnings: 0,
          totalCosts: 0,
          profitLoss: 0,
        },
      };
    }

    // Filter to only completed games (exclude scheduled/future games)
    const completedGames = userGames.filter((game) => {
      const gameDate = new Date(game.date);
      const today = new Date();
      // Only include games from today or earlier, and with results
      return gameDate <= today && game.results && game.results.length > 0;
    });

    // Filter to only games where user participated (should already be calculated by useAllUserGames)
    const userGamesWithResults = completedGames.filter((game) => {
      // Only include games where we have user result data
      return game.userPosition !== undefined;
    });

    const calculatedStats = calculateUserCombinedStats(
      userGamesWithResults,
      currentUser
    );

    return {
      completedUserGames: userGamesWithResults,
      stats: calculatedStats,
    };
  }, [userGames, currentUser]);

  const isLoading = gamesLoading || groupsLoading;

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Authentication Required
          </h2>
          <p className="text-gray-600">
            Please log in to view your game history.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-gray-900">Game History</h1>
            <p className="mt-2 text-gray-600">
              Your complete poker game statistics and history across all groups
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Overall Statistics
          </h2>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse"
                >
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
              <StatsCard
                title="Games Played"
                value={stats.numGames}
                subtitle={`${stats.wins} wins`}
                icon={Calendar}
                colorClass="text-blue-600"
              />

              <StatsCard
                title="Win Rate"
                value={`${stats.winRate}%`}
                subtitle="1st & 2nd place"
                icon={Award}
                colorClass="text-green-600"
              />

              <StatsCard
                title="Avg Position"
                value={stats.avgPosition.toFixed(1)}
                subtitle="Lower is better"
                icon={Target}
                colorClass="text-purple-600"
              />

              <StatsCard
                title="Total Winnings"
                value={formatCurrency(stats.totalWinnings)}
                subtitle="Including best hand"
                icon={DollarSign}
                colorClass="text-emerald-600"
              />

              <StatsCard
                title="Profit/Loss"
                value={formatCurrency(stats.profitLoss)}
                subtitle={`${formatCurrency(stats.totalCosts)} total costs`}
                icon={TrendingUp}
                colorClass={getProfitLossColor(stats.profitLoss)}
              />
            </div>
          )}
        </div>

        {/* Error State */}
        {gamesError && (
          <div className="mb-8 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong>Error:</strong> {gamesError}
          </div>
        )}

        {/* Game History Table */}
        <div>
          <GameHistoryTable
            userGames={completedUserGames}
            loading={isLoading}
          />
        </div>

        {/* Best Hand Summary (if applicable) */}
        {!isLoading && stats.bestHandParticipations > 0 && (
          <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Best Hand Summary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-500">Participations</div>
                <div className="text-xl font-semibold text-gray-900">
                  {stats.bestHandParticipations}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Wins</div>
                <div className="text-xl font-semibold text-green-600">
                  {stats.bestHandWins}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Win Rate</div>
                <div className="text-xl font-semibold text-blue-600">
                  {stats.bestHandParticipations > 0
                    ? `${Math.round((stats.bestHandWins / stats.bestHandParticipations) * 100)}%`
                    : '0%'}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Net Best Hand</div>
                <div
                  className={`text-xl font-semibold ${getProfitLossColor(stats.bestHandWinnings - stats.bestHandCosts)}`}
                >
                  {formatCurrency(stats.bestHandWinnings - stats.bestHandCosts)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameHistoryPage;
