import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Calendar,
  History,
  Settings,
  Plus,
  Edit,
  Mail,
  Trash2,
} from 'lucide-react';

// Import existing components
import UpcomingGamesSection from '../components/games/UpcomingGamesSection.jsx';
import GameHistoryTable from '../components/games/GameHistoryTable.jsx';
import GameFormModal from '../components/games/GameFormModal.jsx';
import GameDetailsModal from '../components/games/GameDetailsModal.jsx';
import LoadingButton from '../components/common/LoadingButton.jsx';
import { GameProvider } from '../context/GameContext.jsx';
import { isGameScheduled } from '../utils/gameUtils.js';
import { DEFAULT_VALUES } from '../constants/ui.js';
import { formatGameDateTime as formatGameDateTimeUtil } from '../utils/dateUtils.js';

// Import the game history functionality
import { useAllUserGames } from '../hooks/useAllUserGames';
import {
  calculateUserCombinedStats,
  formatCurrency,
  getProfitLossColor,
} from '../utils/userStatsUtils';
import StatsCard from '../components/common/StatsCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useGroupsContext } from '../context/GroupsContext.jsx';

const GamesPage = ({
  // Props from main app for Schedule and Manage tabs
  games,
  scheduledGames,
  currentUser,
  selectedGroup,
  groupUsers,
  isAuthenticated,

  // Game management props
  showAddGame,
  isEditing,
  gameFormError,
  newGame,
  gamesLoading,
  groupUsersLoading,
  isGameInFuture,
  onSave,
  onClose,
  updateGameData,
  updatePlayerResult,
  addPlayerToGame,
  removePlayerFromGame,
  addGroupUser,
  openAddGame,

  // RSVP and notifications
  onRSVPChange,
  handleSendInvitations,
  handleSendResults,
  sendingNotifications,
  // Editing actions used by context consumers
  startEditingGame,
  deleteGame,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'schedule';

  // History scope: all | current
  const historyScopeParam = searchParams.get('history') || 'current';
  const [historyScope, setHistoryScope] = useState(historyScopeParam);

  // Game details modal state
  const [selectedGameForDetails, setSelectedGameForDetails] = useState(null);

  // For history tab, we'll use the same hook as GameHistoryPage
  const { groups, loadingGroups } = useGroupsContext();
  const {
    allGames: userGames,
    loading: userGamesLoading,
    error: userGamesError,
  } = useAllUserGames(groups, currentUser);

  const setActiveTab = (tab) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next);
  };

  const setHistoryScopeUrl = (scope) => {
    setHistoryScope(scope);
    const next = new URLSearchParams(searchParams);
    next.set('history', scope);
    setSearchParams(next);
  };

  const handleGameClick = (game) => {
    setSelectedGameForDetails(game);
  };

  const handleCloseGameDetails = () => {
    setSelectedGameForDetails(null);
  };

  // Compute filtered games for selected group (used by GameProvider consumers)
  const filteredGames = React.useMemo(
    () =>
      selectedGroup
        ? games.filter((g) => g.groupId === selectedGroup.groupId)
        : [],
    [games, selectedGroup]
  );

  // Helpers required by consumers
  const getUserDisplayName = (userId) => {
    const user = (groupUsers || []).find((u) => u.userId === userId);
    return user ? user.displayName : 'Unknown User';
  };

  const formatGameDateTime = (game) => {
    const userTimezone = currentUser?.timezone || DEFAULT_VALUES.TIMEZONE;
    return formatGameDateTimeUtil(game, userTimezone);
  };

  // Completed games for Manage tab (selected group only)
  const completedGames = React.useMemo(() => {
    if (!selectedGroup) return [];
    return (games || [])
      .filter(
        (g) =>
          g.groupId === selectedGroup.groupId &&
          (g.status || 'completed') !== 'scheduled'
      )
      .sort((a, b) => {
        const aDate = new Date(`${a.date}T${a.time || '00:00'}:00.000Z`);
        const bDate = new Date(`${b.date}T${b.time || '00:00'}:00.000Z`);
        return bDate - aDate;
      });
  }, [games, selectedGroup]);

  // History: scope filter
  const historyGamesScoped = React.useMemo(() => {
    if (historyScope === 'current' && selectedGroup) {
      return userGames.filter((g) => g.groupId === selectedGroup.groupId);
    }
    return userGames;
  }, [historyScope, userGames, selectedGroup]);

  // Calculate history stats
  const { completedUserGames, stats } = React.useMemo(() => {
    if (!historyGamesScoped.length) {
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

    // Filter to only completed (non-scheduled) and non-future games
    const completedGames = historyGamesScoped.filter((game) => {
      const status = (game.status || '').toLowerCase();
      if (status === 'scheduled') return false;
      const gameDateTime = new Date(
        `${game.date}T${game.time || '00:00'}:00.000Z`
      );
      return (
        gameDateTime <= new Date() && game.results && game.results.length > 0
      );
    });

    const userGamesWithResults = completedGames
      .map((game) => {
        const userResult = game.results?.find(
          (result) => result.userId === currentUser?.userId
        );
        if (!userResult) return null;

        return {
          ...game,
          userResult: {
            ...userResult,
            winnings: userResult.winnings || 0,
            position: userResult.position || 999,
            rebuys: userResult.rebuys || 0,
            bestHandParticipant: userResult.bestHandParticipant || false,
            bestHandWinner: userResult.bestHandWinner || false,
          },
          userPosition: userResult.position || 999,
          userWinnings: userResult.winnings || 0,
          userRebuys: userResult.rebuys || 0,
          userBestHandParticipant: userResult.bestHandParticipant || false,
          userBestHandWinner: userResult.bestHandWinner || false,
          buyin: game.buyin || 20,
          groupName: game.groupName || 'Unknown Group',
        };
      })
      .filter(Boolean);

    const calculatedStats = calculateUserCombinedStats(
      userGamesWithResults,
      currentUser
    );

    return {
      completedUserGames: userGamesWithResults,
      stats: calculatedStats,
    };
  }, [historyGamesScoped, currentUser]);

  const tabs = [
    {
      id: 'schedule',
      label: 'Schedule',
      icon: Calendar,
      description: 'Upcoming games and RSVP management',
    },
    {
      id: 'history',
      label: 'History',
      icon: History,
      description: 'Past games and statistics',
    },
  ];

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Authentication Required
          </h2>
          <p className="text-gray-600">Please log in to view games.</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Games</h1>
            <p className="mt-2 text-gray-600">
              Manage your poker games and track your performance
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-2" />
                  {tab.label}
                  <span className="hidden md:block ml-2 text-xs text-gray-400">
                    {tab.description}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'schedule' && (
          <div>
            {/* Add New Game Button - Only for admins or group owners */}
            {(selectedGroup?.userRole === 'owner' || currentUser?.isAdmin) && (
              <div className="text-center mb-8">
                <LoadingButton
                  loading={gamesLoading}
                  onClick={openAddGame}
                  disabled={!isAuthenticated}
                  className={`px-6 py-3 rounded-lg flex items-center gap-2 mx-auto ${
                    isAuthenticated
                      ? 'bg-blue-500 hover:bg-blue-600 text-white'
                      : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  }`}
                  title={!isAuthenticated ? 'Please login to add games' : ''}
                >
                  <Plus className="w-5 h-5" />
                  Add New Game
                </LoadingButton>
              </div>
            )}

            <GameProvider
              games={games}
              scheduledGames={scheduledGames}
              filteredGames={filteredGames}
              currentUser={currentUser}
              selectedGroup={selectedGroup}
              groupUsers={groupUsers}
              formatGameDateTime={formatGameDateTime}
              getUserDisplayName={getUserDisplayName}
              isGameScheduled={isGameScheduled}
              startEditingGame={startEditingGame}
              deleteGame={deleteGame}
              handleSendInvitations={handleSendInvitations}
              handleSendResults={handleSendResults}
              handleRSVPChange={onRSVPChange}
              gamesLoading={gamesLoading}
              sendingNotifications={sendingNotifications}
              isAuthenticated={isAuthenticated}
            >
              <UpcomingGamesSection />
            </GameProvider>
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            {/* History scope toggle */}
            <div className="flex items-center justify-end gap-3 mb-4">
              <span className="text-sm text-gray-600">Scope:</span>
              <div className="inline-flex rounded-md border border-gray-300 overflow-hidden">
                <button
                  className={`px-3 py-1 text-sm ${historyScope === 'all' ? 'bg-blue-50 text-blue-700' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                  onClick={() => setHistoryScopeUrl('all')}
                >
                  All Groups
                </button>
                <button
                  className={`px-3 py-1 text-sm border-l border-gray-300 ${historyScope === 'current' ? 'bg-blue-50 text-blue-700' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                  onClick={() => setHistoryScopeUrl('current')}
                >
                  Current Group
                </button>
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Your Statistics
              </h2>

              {userGamesLoading || loadingGroups ? (
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
                    icon={Calendar}
                    colorClass="text-green-600"
                  />
                  <StatsCard
                    title="Avg Position"
                    value={stats.avgPosition.toFixed(1)}
                    subtitle="Lower is better"
                    icon={Calendar}
                    colorClass="text-purple-600"
                  />
                  <StatsCard
                    title="Total Winnings"
                    value={formatCurrency(stats.totalWinnings)}
                    subtitle="Including best hand"
                    icon={Calendar}
                    colorClass="text-emerald-600"
                  />
                  <StatsCard
                    title="Profit/Loss"
                    value={formatCurrency(stats.profitLoss)}
                    subtitle={`${formatCurrency(stats.totalCosts)} total costs`}
                    icon={Calendar}
                    colorClass={getProfitLossColor(stats.profitLoss)}
                  />
                </div>
              )}
            </div>

            {/* Error State */}
            {userGamesError && (
              <div className="mb-8 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <strong>Error:</strong> {userGamesError}
              </div>
            )}

            {/* Game History Table */}
            <div>
              <GameHistoryTable
                userGames={completedUserGames}
                loading={userGamesLoading || loadingGroups}
                onGameClick={handleGameClick}
              />
            </div>

            {/* Game Management Section - Only for admins or group owners */}
            {(selectedGroup?.userRole === 'owner' || currentUser?.isAdmin) && (
              <div className="mt-8">
                <div className="bg-white rounded-lg border border-gray-200">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                      <Settings className="w-6 h-6 text-blue-600" />
                      <h2 className="text-2xl font-semibold text-gray-800">
                        Manage Past Games
                      </h2>
                    </div>
                    <p className="text-gray-600 mt-2">
                      Edit results and send notifications for completed games in
                      your group.
                    </p>
                  </div>

                  {completedGames.length === 0 ? (
                    <div className="p-6 text-center text-gray-600">
                      No completed games yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                              Date
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                              Location
                            </th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                              Players
                            </th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                              Total Winnings
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {completedGames.map((game) => {
                            const totalWinnings = (game.results || []).reduce(
                              (sum, r) => sum + (r.winnings || 0),
                              0
                            );
                            return (
                              <tr key={game.id}>
                                <td className="px-4 py-3">
                                  {formatGameDateTime(game)}
                                </td>
                                <td className="px-4 py-3">
                                  {game.location || '-'}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {game.results?.length || 0}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  ${totalWinnings.toFixed(0)}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() =>
                                        isAuthenticated &&
                                        startEditingGame(game)
                                      }
                                      className={`px-3 py-2 rounded-lg flex items-center gap-2 ${
                                        isAuthenticated
                                          ? 'text-blue-600 hover:text-blue-800 hover:bg-blue-50'
                                          : 'text-gray-400 cursor-not-allowed'
                                      }`}
                                      disabled={!isAuthenticated}
                                      title={
                                        isAuthenticated
                                          ? 'Edit game'
                                          : 'Please login to edit games'
                                      }
                                    >
                                      <Edit className="w-4 h-4" />
                                      Edit
                                    </button>
                                    <LoadingButton
                                      loading={sendingNotifications}
                                      onClick={() => handleSendResults(game.id)}
                                      className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-lg flex items-center gap-1 sm:gap-2 ${
                                        isAuthenticated
                                          ? 'bg-purple-600 text-white hover:bg-purple-700'
                                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                      }`}
                                      disabled={!isAuthenticated}
                                      title={
                                        isAuthenticated
                                          ? 'Send game results'
                                          : 'Please login to send results'
                                      }
                                    >
                                      <Mail className="w-3 h-3 sm:w-4 sm:h-4" />
                                      <span className="hidden sm:inline">
                                        Send Results
                                      </span>
                                      <span className="sm:hidden">Results</span>
                                    </LoadingButton>
                                    <button
                                      onClick={() => {
                                        console.log(
                                          'Deleting game with ID:',
                                          game.id,
                                          'Full game object:',
                                          game
                                        );
                                        if (
                                          isAuthenticated &&
                                          confirm(
                                            `Are you sure you want to delete the game from ${formatGameDateTime(game)}? This action cannot be undone.`
                                          )
                                        ) {
                                          deleteGame(game.id);
                                        }
                                      }}
                                      className={`px-3 py-2 rounded-lg flex items-center gap-2 ${
                                        isAuthenticated
                                          ? 'text-red-600 hover:text-red-800 hover:bg-red-50'
                                          : 'text-gray-400 cursor-not-allowed'
                                      }`}
                                      disabled={!isAuthenticated}
                                      title={
                                        isAuthenticated
                                          ? 'Delete game'
                                          : 'Please login to delete games'
                                      }
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Game Form Modal */}
      <GameFormModal
        showAddGame={showAddGame}
        isEditing={isEditing}
        gameFormError={gameFormError}
        newGame={newGame}
        gamesLoading={gamesLoading}
        groupUsers={groupUsers}
        groupUsersLoading={groupUsersLoading}
        isGameInFuture={isGameInFuture}
        selectedGroup={selectedGroup}
        onSave={onSave}
        onClose={onClose}
        updateGameData={updateGameData}
        updatePlayerResult={updatePlayerResult}
        addPlayerToGame={addPlayerToGame}
        removePlayerFromGame={removePlayerFromGame}
        addGroupUser={addGroupUser}
      />

      {/* Game Details Modal */}
      <GameDetailsModal
        game={selectedGameForDetails}
        onClose={handleCloseGameDetails}
        groupUsers={groupUsers}
      />
    </div>
  );
};

export default GamesPage;
