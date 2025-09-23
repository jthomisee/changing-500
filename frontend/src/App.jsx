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
import MainNavigation from './components/navigation/MainNavigation.jsx';

// Pages
import RSVPPage from './pages/RSVPPage.jsx';
import TokenRSVPPage from './pages/TokenRSVPPage.jsx';
import TermsPage from './pages/TermsPage.jsx';
import PrivacyPage from './pages/PrivacyPage.jsx';
import GameHistoryPage from './pages/GameHistoryPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import GamesPage from './pages/GamesPage.jsx';
import GroupsPage from './pages/GroupsPage.jsx';
import SMSVerificationPage from './pages/SMSVerificationPage.jsx';

// Services
import {
  triggerGameInvitations,
  triggerGameResults,
} from './services/notificationService';
import GroupManagement from './components/groups/GroupManagement.jsx';
import GroupFormModal from './components/groups/GroupFormModal.jsx';

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
            {/* Dashboard - New main page */}
            <Route
              path="/"
              element={
                <GamesProvider>
                  <Changing500 />
                </GamesProvider>
              }
            />

            {/* Games - New tabbed interface */}
            <Route
              path="/games"
              element={
                <GamesProvider>
                  <Changing500 />
                </GamesProvider>
              }
            />

            {/* Groups - Enhanced page */}
            <Route
              path="/groups"
              element={
                <GamesProvider>
                  <Changing500 />
                </GamesProvider>
              }
            />

            {/* Profile */}
            <Route
              path="/profile"
              element={
                <GamesProvider>
                  <Changing500 />
                </GamesProvider>
              }
            />

            {/* Admin */}
            <Route path="/admin/users" element={<AdminUsersPage />} />

            {/* Legacy routes */}
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
            <Route path="/game-history" element={<GameHistoryPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/sms-verification" element={<SMSVerificationPage />} />
          </Routes>
        </Router>
      </GroupsProvider>
    </AuthProvider>
  );
};

// Core App Component - Now acts as a layout with page routing
const Changing500 = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

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

  // Create separate standings for tournament and cash games
  const {
    standings: tournamentStandings,
    sortField: tournamentSortField,
    sortDirection: tournamentSortDirection,
    handleSort: handleTournamentSort,
    isLoading: tournamentStandingsLoading,
  } = useStandings(
    filteredGames.filter((game) => game.gameType !== 'cash'),
    groupUsers,
    groupUsersLoading
  );

  const {
    standings: cashStandings,
    sortField: cashSortField,
    sortDirection: cashSortDirection,
    handleSort: handleCashSort,
    isLoading: cashStandingsLoading,
  } = useStandings(
    filteredGames.filter((game) => game.gameType === 'cash'),
    groupUsers,
    groupUsersLoading
  );

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

  // Determine current page based on route
  const getCurrentPage = () => {
    const path = location.pathname;
    if (path === '/') return 'dashboard';
    if (path.startsWith('/games')) return 'games';
    if (path.startsWith('/groups')) return 'groups';
    if (path === '/profile') return 'profile';
    return 'dashboard';
  };

  const currentPage = getCurrentPage();

  // Get upcoming games for current user's groups (declare before using in pendingActions)
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

  // Calculate pending actions for navigation badge
  const pendingActions = React.useMemo(() => {
    if (!currentUser || !upcomingGames) return 0;

    return upcomingGames.filter((game) => {
      const userResult = game.results?.find(
        (r) => r.userId === currentUser.userId
      );
      return !userResult?.rsvpStatus || userResult.rsvpStatus === 'pending';
    }).length;
  }, [currentUser, upcomingGames]);

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

  // Navigation handlers
  const handleNavigateToGames = (tab = 'schedule') => {
    navigate(`/games?tab=${tab}`);
  };

  const handleNavigateToGroups = (tab = 'current') => {
    navigate(`/groups?tab=${tab}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - only show on certain pages */}
      {(currentPage === 'dashboard' ||
        currentPage === 'games' ||
        currentPage === 'groups') && (
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
      )}

      {/* Main Navigation */}
      <MainNavigation
        isMobile={isMobile}
        currentUser={currentUser}
        isAdmin={isAdmin}
        pendingActions={pendingActions}
      />

      {/* Main Content Area */}
      <div
        className={`${isMobile ? 'pb-16' : 'pl-64'} ${currentPage === 'dashboard' || currentPage === 'games' || currentPage === 'groups' ? 'pt-4' : 'pt-16'}`}
      >
        {/* Dashboard Page */}
        {currentPage === 'dashboard' && (
          <DashboardPage
            currentUser={currentUser}
            selectedGroup={selectedGroup}
            groups={groups}
            upcomingGames={upcomingGames}
            standings={standings}
            onRSVPChange={handleRSVPChange}
            onNavigateToGames={handleNavigateToGames}
            onNavigateToGroups={handleNavigateToGroups}
          />
        )}

        {/* Games Page */}
        {currentPage === 'games' && (
          <GamesPage
            games={games}
            scheduledGames={scheduledGames}
            currentUser={currentUser}
            selectedGroup={selectedGroup}
            groupUsers={groupUsers}
            isAuthenticated={isAuthenticated}
            startEditingGame={startEditingGame}
            deleteGame={deleteGame}
            showAddGame={showAddGame}
            isEditing={isEditing}
            gameFormError={gameFormError}
            newGame={newGame}
            gamesLoading={gamesLoading}
            groupUsersLoading={groupUsersLoading}
            isGameInFuture={isGameInFuture}
            onSave={handleSaveGame}
            onClose={closeForm}
            updateGameData={updateGameData}
            updatePlayerResult={updatePlayerResult}
            addPlayerToGame={addPlayerToGame}
            removePlayerFromGame={removePlayerFromGame}
            addGroupUser={addGroupUser}
            openAddGame={openAddGame}
            onRSVPChange={handleRSVPChange}
            handleSendInvitations={handleSendInvitations}
            handleSendResults={handleSendResults}
            sendingNotifications={sendingNotifications}
          />
        )}

        {/* Groups Page */}
        {currentPage === 'groups' && (
          <GroupsPage
            currentUser={currentUser}
            isAdmin={isAdmin}
            groups={groups}
            selectedGroup={selectedGroup}
            loadingGroups={loadingGroups}
            groupError={groupError}
            selectGroup={selectGroup}
            createNewGroup={createNewGroup}
            standings={standings}
            standingsLoading={standingsLoading}
            sortField={sortField}
            sortDirection={sortDirection}
            handleSort={handleSort}
            tournamentStandings={tournamentStandings}
            tournamentStandingsLoading={tournamentStandingsLoading}
            tournamentSortField={tournamentSortField}
            tournamentSortDirection={tournamentSortDirection}
            handleTournamentSort={handleTournamentSort}
            cashStandings={cashStandings}
            cashStandingsLoading={cashStandingsLoading}
            cashSortField={cashSortField}
            cashSortDirection={cashSortDirection}
            handleCashSort={handleCashSort}
            expandedRows={expandedRows}
            toggleRowExpanded={toggleRowExpanded}
            isMobile={isMobile}
            setShowCreateGroup={setShowCreateGroup}
          />
        )}

        {/* Profile Page */}
        {currentPage === 'profile' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-white border-b border-gray-200 mb-8">
              <div className="py-6">
                <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
                <p className="mt-2 text-gray-600">
                  Manage your account settings and preferences
                </p>
              </div>
            </div>
            <UserProfile />
          </div>
        )}
      </div>

      {/* Modals */}
      <LoginModal
        show={showUserAuth}
        onClose={() => setShowUserAuth(false)}
        loading={authLoading}
        onSubmit={handleAuthSubmit}
      />

      {/* Create Group Modal */}
      <GroupFormModal
        show={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onGroupCreated={(newGroup) => {
          setShowCreateGroup(false);
          // Optionally refresh groups or handle the new group
        }}
      />
    </div>
  );
};

// Standalone Admin Users Page - minimal providers needed
const AdminUsersPage = () => {
  const { isAdmin, currentUser } = useAuth();
  const { isMobile } = useMobileDetection();

  // Redirect non-admin users
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Navigation */}
      <MainNavigation
        isMobile={isMobile}
        currentUser={currentUser}
        isAdmin={isAdmin}
        pendingActions={0}
      />

      {/* Main Content Area */}
      <div className={`${isMobile ? 'pb-16' : 'pl-64'} pt-16`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white border-b border-gray-200 mb-8">
            <div className="py-6">
              <h1 className="text-3xl font-bold text-gray-900">
                User Management
              </h1>
              <p className="mt-2 text-gray-600">
                Manage users and system settings
              </p>
            </div>
          </div>
          <UserManagement />
        </div>
      </div>
    </div>
  );
};

export default Changing500App;
