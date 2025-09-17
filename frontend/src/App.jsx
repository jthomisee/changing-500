import React, { useEffect, useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import {
  Plus,
  DollarSign,
  Calendar,
  Users,
  Edit,
  Trash2,
  X,
  Save,
  Loader,
  MapPin,
} from 'lucide-react';

// Context and Hooks
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { GroupsProvider, useGroupsContext } from './context/GroupsContext.jsx';
import { GamesProvider, useGamesContext } from './context/GamesContext.jsx';
import { useStandings } from './hooks/useStandings';
import { useGameForm } from './hooks/useGameForm';
import { useGroupUsers } from './hooks/useGroupUsers';
import { useAuthHandlers } from './hooks/useAuthHandlers';
import { useMobileDetection } from './hooks/useResponsive';

// Components
import LoginModal from './components/auth/LoginModal.jsx';
import LoadingButton from './components/common/LoadingButton.jsx';
import PlayerInput from './components/games/PlayerInput.jsx';
import UserManagement from './components/admin/UserManagement.jsx';
import UserProfile from './components/user/UserProfile.jsx';
import HeaderSection from './components/layout/HeaderSection.jsx';
import LeaderboardSection from './components/games/LeaderboardSection.jsx';
import UpcomingGamesSection from './components/games/UpcomingGamesSection.jsx';
import RecentGamesSection from './components/games/RecentGamesSection.jsx';
import GameFormModal from './components/games/GameFormModal.jsx';
import { GameProvider } from './context/GameContext.jsx';

// Pages
import RSVPPage from './pages/RSVPPage.jsx';
import TokenRSVPPage from './pages/TokenRSVPPage.jsx';
import TermsPage from './pages/TermsPage.jsx';
import PrivacyPage from './pages/PrivacyPage.jsx';
import GameHistoryPage from './pages/GameHistoryPage.jsx';

// Services
import {
  triggerGameInvitations,
  triggerGameResults,
} from './services/notificationService';
import GroupManagement from './components/groups/GroupManagement.jsx';

// Utils
import { isGameScheduled } from './utils/gameUtils';
import {
  formatGameDateTime as formatGameDateTimeUtil,
  convertToUTC,
  isGameInFuture,
} from './utils/dateUtils';

// Constants
import { DEFAULT_VALUES, UI_TEXT } from './constants/ui';

// Styles

// Main App Component (wrapped with AuthProvider and Router)
const Changing500App = () => {
  return (
    <AuthProvider>
      <GroupsProvider>
        <Router>
          <Routes>
            <Route
              path="/"
              element={
                <GamesProvider>
                  <Changing500 />
                </GamesProvider>
              }
            />
            <Route
              path="/rsvp"
              element={
                <GamesProvider>
                  <RSVPPage />
                </GamesProvider>
              }
            />
            <Route
              path="/rsvp/:gameId/:userId"
              element={
                <GamesProvider>
                  <RSVPPage />
                </GamesProvider>
              }
            />
            <Route path="/rsvp-token/:token" element={<TokenRSVPPage />} />
            <Route
              path="/profile"
              element={
                <GamesProvider>
                  <Changing500 activeView="profile" />
                </GamesProvider>
              }
            />
            <Route
              path="/admin/users"
              element={
                <GamesProvider>
                  <Changing500 activeView="users" />
                </GamesProvider>
              }
            />
            <Route
              path="/groups"
              element={
                <GamesProvider>
                  <Changing500 activeView="groups" />
                </GamesProvider>
              }
            />
            <Route path="/game-history" element={<GameHistoryPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
          </Routes>
        </Router>
      </GroupsProvider>
    </AuthProvider>
  );
};

// Core App Component
const Changing500 = ({ activeView: propActiveView }) => {
  const navigate = useNavigate();
  const location = useLocation();
  // Authentication
  const { isAdmin, currentUser, loading: authLoading } = useAuth();

  // Game Management
  const {
    games,
    scheduledGames,
    loading: gamesLoading,
    error: gamesError,
    setError: setGamesError,
    saveGame,
    updateGame,
    deleteGame,
  } = useGamesContext();

  // Groups Management (must come first to define selectedGroup)
  const {
    groups,
    selectedGroup,
    loadingGroups,
    groupError,
    selectGroup,
    createNewGroup,
  } = useGroupsContext();

  // Group Users (must come before it's used in getUserDisplayName and useStandings)
  const {
    groupUsers,
    loading: groupUsersLoading,
    addGroupUser,
  } = useGroupUsers(selectedGroup?.groupId);

  // Standings
  // Filter games by selected group
  const filteredGames = selectedGroup
    ? games.filter((game) => game.groupId === selectedGroup.groupId)
    : [];

  // Helper function to get user display name from userId
  const getUserDisplayName = (userId) => {
    const user = groupUsers.find((u) => u.userId === userId);
    return user ? user.displayName : 'Unknown User';
  };

  const {
    standings,
    sortField,
    sortDirection,
    handleSort,
    isLoading: standingsLoading,
  } = useStandings(filteredGames, groupUsers, groupUsersLoading);

  // Mobile expandable rows state
  const [expandedRows, setExpandedRows] = useState(new Set());

  // Screen size detection for responsive layout
  const { isMobile } = useMobileDetection();

  // Authentication handlers
  const { handleUserAuthSubmit } = useAuthHandlers();

  // Toggle expanded row for mobile
  const toggleRowExpanded = (playerId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(playerId)) {
      newExpanded.delete(playerId);
    } else {
      newExpanded.add(playerId);
    }
    setExpandedRows(newExpanded);
  };

  // Game Form
  const {
    showAddGame,
    editingGame,
    newGame,
    openAddGame,
    startEditingGame,
    closeForm: originalCloseForm,
    updateGameData,
    addPlayerToGame,
    removePlayerFromGame,
    updatePlayerResult,
    isEditing,
  } = useGameForm();

  // Local closeForm wrapper that also clears errors
  const closeForm = () => {
    setGameFormError(''); // Clear form errors
    originalCloseForm();
  };

  // User Search (legacy - kept for backward compatibility but unused)
  // const { availableUsers, searchForUsers, clearUsers } = useUsers();

  // Group Users moved above to avoid initialization errors

  // Groups Management (moved above to avoid initialization error)

  // Local state for modals and views
  const [showUserAuth, setShowUserAuth] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [gameFormError, setGameFormError] = useState('');

  // Determine active view based on route or prop
  const getActiveView = () => {
    if (propActiveView) return propActiveView;
    const path = location.pathname;
    if (path === '/profile') return 'profile';
    if (path === '/admin/users') return 'users';
    if (path === '/groups') return 'groups';
    return 'games';
  };

  const activeView = getActiveView();

  // Games are loaded automatically by useGamesContext when authenticated

  // Authentication submission wrapper
  const handleAuthSubmit = async (mode, formData) => {
    const result = await handleUserAuthSubmit(mode, formData, () => {
      setShowUserAuth(false);
      // Games will be loaded automatically by useGamesContext when auth changes
    });

    // Close modal on success (except when manual login required)
    if (result.success && !result.requiresManualLogin) {
      setShowUserAuth(false);
    }
  };

  const isAuthenticated = !!currentUser;

  // Helper function to format time for display using user's timezone
  const formatGameDateTime = (game) => {
    const userTimezone = currentUser?.timezone || DEFAULT_VALUES.TIMEZONE;
    return formatGameDateTimeUtil(game, userTimezone);
  };

  // Notification handlers
  const [sendingNotifications, setSendingNotifications] = useState(false);

  const handleSendInvitations = async (gameId) => {
    setSendingNotifications(true);
    try {
      const result = await triggerGameInvitations(gameId);
      if (result.success) {
        // Show success message or notification
        console.log('Game invitations sent successfully');
      } else {
        console.error('Failed to send invitations:', result.error);
      }
    } catch (error) {
      console.error('Error sending invitations:', error);
    } finally {
      setSendingNotifications(false);
    }
  };

  const handleSendResults = async (gameId) => {
    setSendingNotifications(true);
    try {
      const result = await triggerGameResults(gameId);
      if (result.success) {
        // Show success message or notification
        console.log('Game results notifications sent successfully');
      } else {
        console.error('Failed to send results notifications:', result.error);
      }
    } catch (error) {
      console.error('Error sending results notifications:', error);
    } finally {
      setSendingNotifications(false);
    }
  };

  // Handle RSVP change from dropdown
  const handleRSVPChange = async (gameId, newStatus) => {
    try {
      // Find the game and update the current user's RSVP status
      const game = filteredGames.find((g) => g.id === gameId);
      if (!game) return;

      // Create updated results with the user's new RSVP status
      const updatedResults = game.results.map((result) => {
        if (result.userId === currentUser.userId) {
          return { ...result, rsvpStatus: newStatus };
        }
        return result;
      });

      // Update the game with new RSVP status
      const updatedGame = { ...game, results: updatedResults };
      await updateGame(gameId, updatedGame);
    } catch (error) {
      console.error('Failed to update RSVP:', error);
    }
  };

  // Get upcoming games for current user's groups
  const upcomingGames = (
    selectedGroup
      ? scheduledGames.filter((g) => g.groupId === selectedGroup.groupId)
      : scheduledGames
  )
    .filter((game) =>
      game.results?.some((r) => r.userId === currentUser?.userId)
    )
    .sort((a, b) => {
      const aDateTime = new Date(`${a.date}T${a.time || '00:00'}:00.000Z`);
      const bDateTime = new Date(`${b.date}T${b.time || '00:00'}:00.000Z`);
      return aDateTime - bDateTime;
    });

  // Game form handlers
  const handleSaveGame = async (e) => {
    e.preventDefault();
    setGameFormError(''); // Clear any previous errors

    // Check if a group is selected
    if (!selectedGroup) {
      setGameFormError(UI_TEXT.GAMES.SELECT_GROUP_FIRST);
      return;
    }

    try {
      // Get user's timezone preference
      const userTimezone = currentUser?.timezone || DEFAULT_VALUES.TIMEZONE;

      // Convert local time to UTC for storage
      const { date: utcDate, time: utcTime } = convertToUTC(
        newGame.date,
        newGame.time,
        userTimezone
      );

      // For new games, force scheduled status if time is in the future
      // For editing existing games, respect the user's choice
      let gameStatus;
      if (isEditing) {
        gameStatus = newGame.status || 'completed';
      } else {
        gameStatus = isGameInFuture(utcDate, utcTime)
          ? 'scheduled'
          : 'completed';
      }

      // Include groupId and status in the game data
      const gameDataWithGroup = {
        ...newGame,
        date: utcDate,
        time: utcTime,
        status: gameStatus,
        groupId: selectedGroup.groupId,
      };

      if (isEditing) {
        await updateGame(editingGame.id, gameDataWithGroup);
      } else {
        await saveGame(gameDataWithGroup);
      }
      closeForm();
    } catch (error) {
      setGameFormError('Failed to save game: ' + error.message);
    }
  };

  // Group creation handler
  const handleCreateGroup = async (groupData) => {
    try {
      const result = await createNewGroup(groupData);
      if (result.success) {
        setShowCreateGroup(false);
        return { success: true };
      }
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <HeaderSection
          isMobile={isMobile}
          currentUser={currentUser}
          isAdmin={isAdmin}
          navigate={navigate}
          groups={groups}
          selectedGroup={selectedGroup}
          loadingGroups={loadingGroups}
          groupError={groupError}
          selectGroup={selectGroup}
          setShowCreateGroup={setShowCreateGroup}
          upcomingGames={upcomingGames}
          onRSVPChange={handleRSVPChange}
          gamesError={gamesError}
          setGamesError={setGamesError}
          setShowUserAuth={setShowUserAuth}
        />

        {/* User Profile View */}
        {activeView === 'profile' && (
          <div className="mb-8">
            <UserProfile />
          </div>
        )}

        {/* Admin User Management View */}
        {isAdmin && activeView === 'users' && (
          <div className="mb-8">
            <UserManagement />
          </div>
        )}

        {/* Group Management View */}
        {(selectedGroup?.userRole === 'owner' || isAdmin) &&
          activeView === 'groups' && (
            <div className="mb-8">
              <GroupManagement
                selectedGroup={selectedGroup}
                onClose={() => navigate('/')}
              />
            </div>
          )}

        {/* Games View */}
        {activeView === 'games' && (
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
            handleRSVPChange={handleRSVPChange}
            gamesLoading={gamesLoading}
            sendingNotifications={sendingNotifications}
            isAuthenticated={isAuthenticated}
          >
            {/* Add Game Button */}
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

            {/* Group Leaderboard */}
            <LeaderboardSection
              isMobile={isMobile}
              standings={standings}
              standingsLoading={standingsLoading}
              sortField={sortField}
              sortDirection={sortDirection}
              handleSort={handleSort}
              expandedRows={expandedRows}
              toggleRowExpanded={toggleRowExpanded}
            />

            {/* Upcoming Games */}
            <UpcomingGamesSection />

            {/* Recent Games */}
            <RecentGamesSection openAddGame={openAddGame} />

            {/* Game Form Modal */}
            <GameFormModal
              showAddGame={showAddGame}
              isEditing={isEditing}
              gameFormError={gameFormError}
              newGame={newGame}
              gamesLoading={gamesLoading}
              groupUsers={groupUsers}
              groupUsersLoading={groupUsersLoading}
              isGameInFuture={(date, time) => isGameInFuture(date, time)}
              onSave={handleSaveGame}
              onClose={closeForm}
              updateGameData={updateGameData}
              updatePlayerResult={updatePlayerResult}
              addPlayerToGame={addPlayerToGame}
              removePlayerFromGame={removePlayerFromGame}
              addGroupUser={addGroupUser}
            />
          </GameProvider>
        )}

        {/* Modals */}
        <LoginModal
          show={showUserAuth}
          onClose={() => setShowUserAuth(false)}
          loading={authLoading}
          onSubmit={handleAuthSubmit}
        />

        {/* Create Group Modal */}
        {showCreateGroup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="flex justify-between items-center p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">
                  Create New Group
                </h3>
                <button
                  onClick={() => setShowCreateGroup(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <CreateGroupForm
                onSubmit={handleCreateGroup}
                onCancel={() => setShowCreateGroup(false)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Create Group Form Component
const CreateGroupForm = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Group name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await onSubmit(formData);
      if (result.success) {
        setFormData({ name: '', description: '' });
      } else {
        setError(result.error || 'Failed to create group');
      }
    } catch (err) {
      setError('Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Group Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter group name"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description (Optional)
          </label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Describe your group"
            rows="3"
            disabled={loading}
          />
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
      </div>

      <div className="flex gap-3 justify-end mt-6">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !formData.name.trim()}
          className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          {loading ? 'Creating...' : 'Create Group'}
        </button>
      </div>
    </form>
  );
};

export default Changing500App;
