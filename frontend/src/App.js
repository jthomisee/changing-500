import React, { useEffect, useState } from 'react';
import { Trophy, Plus, DollarSign, Calendar, Users, TrendingUp, Edit, Trash2, X, Save, Settings, ChevronDown, Loader } from 'lucide-react';

// Context and Hooks
import { AuthProvider, useAuth } from './context/AuthContext';
import { useGames } from './hooks/useGames';
import { useStandings } from './hooks/useStandings';
import { useGameForm } from './hooks/useGameForm';
import { useGroups } from './hooks/useGroups';
import { useGroupUsers } from './hooks/useGroupUsers';

// Components
import AuthButtons from './components/auth/AuthButtons';
import LoginModal from './components/auth/LoginModal';
import LoadingButton from './components/common/LoadingButton';
import SortableHeader from './components/common/SortableHeader';
import PlayerInput from './components/games/PlayerInput';
import UserManagement from './components/admin/UserManagement';
import UserProfile from './components/user/UserProfile';
import UserDropdown from './components/user/UserDropdown';

// Services
import { triggerGameInvitations, triggerGameResults } from './services/notificationService';
import GroupManagement from './components/groups/GroupManagement';
import GroupSelector from './components/groups/GroupSelector';

// Utils
import { calculatePoints } from './utils/gameUtils';

// Styles
import './App.css';

// Main App Component (wrapped with AuthProvider)
const Changing500App = () => {
  return (
    <AuthProvider>
      <Changing500 />
    </AuthProvider>
  );
};

// Core App Component
const Changing500 = () => {
  // Authentication
  const { 
    isAdmin, 
    currentUser, 
    loading: authLoading,
    handleUserRegister,
    handleUserLogin,
    handleUserLogout
  } = useAuth();

  // Game Management
  const {
    games,
    loading: gamesLoading,
    error: gamesError,
    setError: setGamesError,
    loadAllGames,
    saveGame,
    updateGame,
    deleteGame
  } = useGames();

  // Groups Management (must come first to define selectedGroup)  
  const { groups, selectedGroup, loadingGroups, groupError, selectGroup, createNewGroup } = useGroups();

  // Group Users (must come before it's used in getUserDisplayName and useStandings)
  const {
    groupUsers,
    loading: groupUsersLoading,
    addStubUser
  } = useGroupUsers(selectedGroup?.groupId);

  // Standings
  // Filter games by selected group
  const filteredGames = selectedGroup 
    ? games.filter(game => game.groupId === selectedGroup.groupId)
    : [];
  
  // Helper function to get user display name from userId
  const getUserDisplayName = (userId) => {
    const user = groupUsers.find(u => u.userId === userId);
    return user ? user.displayName : 'Unknown User';
  };

  const {
    standings,
    sortField,
    sortDirection,
    handleSort,
    getSortIcon,
    isLoading: standingsLoading
  } = useStandings(filteredGames, groupUsers, groupUsersLoading);

  // Mobile expandable rows state
  const [expandedRows, setExpandedRows] = useState(new Set());
  
  // Screen size detection for responsive layout
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    isEditing
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
  const [activeView, setActiveView] = useState('games'); // 'games', 'users', 'profile', or 'groups'
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [gameFormError, setGameFormError] = useState('');

  // Load games on mount
  useEffect(() => {
    loadAllGames();
  }, [loadAllGames]);

  // Authentication handlers
  const handleUserAuthSubmit = async (mode, formData) => {
    try {
      if (mode === 'register') {
        const { email, password, confirmPassword, firstName, lastName, phone } = formData;
        if (!password || !firstName || !lastName) {
          alert('Please fill in all required fields');
          return;
        }

        if (!email && !phone) {
          alert('Please provide either an email address or phone number');
          return;
        }

        if (password !== confirmPassword) {
          alert('Passwords do not match');
          return;
        }

        if (password.length < 6) {
          alert('Password must be at least 6 characters long');
          return;
        }

        const result = await handleUserRegister({ email, password, firstName, lastName, phone });

        if (result.success) {
          // Auto-login after successful registration using email or phone
          const username = email || phone;
          const loginResult = await handleUserLogin(username, password);
          if (loginResult.success) {
            setShowUserAuth(false);
            // Reload data to show user's games
            loadAllGames();
            return;
      } else {
            alert('Registration successful! Please login manually.');
            return;
          }
    } else {
          alert(`Registration failed: ${result.error}`);
        }
    } else {
        const { username, password } = formData;
        if (!username || !password) {
          alert('Please enter username (email or phone) and password');
          return;
        }

        const result = await handleUserLogin(username, password);

        if (result.success) {
          setShowUserAuth(false);
          return;
      } else {
          alert(`Login failed: ${result.error}`);
        }
      }
    } catch (error) {
      alert(error.message);
    }
  };

  const isAuthenticated = !!currentUser;

  // Helper function to check if a game is scheduled (not completed)
  const isGameScheduled = (game) => {
    return game.status === 'scheduled';
  };

  // Helper function to check if a game is scheduled for the future (handles UTC stored times)  
  const isGameInFuture = (gameDate, gameTime) => {
    if (!gameDate) return false;
    
    const gameDateTime = gameTime ? 
      new Date(`${gameDate}T${gameTime}:00.000Z`) : // Treat stored time as UTC
      new Date(`${gameDate}T00:00:00.000Z`);
    
    return gameDateTime > new Date();
  };

  // Helper function to convert local datetime to UTC for storage
  const convertToUTC = (date, time) => {
    if (!date) return { date, time: null };
    
    if (time) {
      // Create a date object in local timezone
      const localDateTime = new Date(`${date}T${time}`);
      // Convert to UTC
      const utcDate = localDateTime.toISOString().split('T')[0];
      const utcTime = localDateTime.toISOString().split('T')[1].substring(0, 5);
      return { date: utcDate, time: utcTime };
    }
    
    return { date, time: null };
  };

  // Helper function to convert UTC datetime from database to local time for display
  const convertFromUTC = (utcDate, utcTime) => {
    if (!utcDate) return { date: '', time: '' };
    
    if (utcTime) {
      // Create a UTC date object
      const utcDateTime = new Date(`${utcDate}T${utcTime}:00.000Z`);
      // Convert to local timezone
      const localDate = utcDateTime.toLocaleDateString('en-CA'); // YYYY-MM-DD format
      const localTime = utcDateTime.toLocaleTimeString('en-GB', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      }); // HH:MM format
      return { date: localDate, time: localTime };
    }
    
    return { date: utcDate, time: '' };
  };

  // Helper function to format time for display (handles both UTC stored times and local display)
  const formatGameDateTime = (game) => {
    if (!game.date) return '';
    
    if (game.time) {
      // Convert UTC time to local time for display
      const { date: localDate, time: localTime } = convertFromUTC(game.date, game.time);
      const localDateTime = new Date(`${localDate}T${localTime}`);
      return localDateTime.toLocaleString();
    }
    
    return new Date(game.date).toLocaleDateString();
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
      const game = filteredGames.find(g => g.id === gameId);
      if (!game) return;

      // Create updated results with the user's new RSVP status
      const updatedResults = game.results.map(result => {
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
  const upcomingGames = filteredGames
    .filter(game => isGameScheduled(game))
    .filter(game => game.results?.some(r => r.userId === currentUser?.userId))
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
      setGameFormError('Please select a group first');
      return;
    }
    
    try {
      // Convert local time to UTC for storage
      const { date: utcDate, time: utcTime } = convertToUTC(newGame.date, newGame.time);
      
      // For new games, force scheduled status if time is in the future
      // For editing existing games, respect the user's choice
      let gameStatus;
      if (isEditing) {
        gameStatus = newGame.status || 'completed';
      } else {
        gameStatus = isGameInFuture(utcDate, utcTime) ? 'scheduled' : 'completed';
      }
      
      // Include groupId and status in the game data
      const gameDataWithGroup = {
        ...newGame,
        date: utcDate,
        time: utcTime,
        status: gameStatus,
        groupId: selectedGroup.groupId
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
        <div className="mb-8">
          {/* Top Header Bar */}
          {isMobile ? (
            // Mobile: Vertical layout
            <div className="mb-4">
              {/* App Title - Full width on mobile */}
              <button 
                onClick={() => setActiveView('games')}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer w-full justify-center mb-4"
              >
                <Trophy className="w-8 h-8 text-yellow-500 flex-shrink-0" />
                <h1 className="text-2xl font-bold text-gray-800">Changing 500</h1>
              </button>
              
              {/* User Actions - Below title, stacked vertically */}
              <div className="flex flex-col items-center gap-3">
                {currentUser ? (
                  <UserDropdown 
                    onProfileClick={() => setActiveView('profile')} 
                    onUserManagementClick={() => setActiveView('users')}
                    onGroupMembersClick={() => setActiveView('groups')}
                    selectedGroup={selectedGroup}
                    upcomingGames={upcomingGames}
                    onRSVPChange={handleRSVPChange}
                  />
                ) : (
                  <AuthButtons 
                    onShowUserAuth={() => setShowUserAuth(true)}
                  />
                )}
                
                {currentUser && (
                  <GroupSelector
                    groups={groups}
                    selectedGroup={selectedGroup}
                    onSelectGroup={selectGroup}
                    onCreateGroup={() => setShowCreateGroup(true)}
                    loading={loadingGroups}
                    error={groupError}
                    isAdmin={isAdmin}
                  />
                )}
              </div>
            </div>
          ) : (
            // Desktop: Horizontal layout
            <div className="flex items-center justify-between mb-4">
              {/* Left: App Title */}
              <button 
                onClick={() => setActiveView('games')}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer min-w-0"
              >
                <Trophy className="w-10 h-10 text-yellow-500 flex-shrink-0" />
                <h1 className="text-4xl font-bold text-gray-800 truncate">Changing 500</h1>
              </button>
              
              {/* Right: User Actions */}
              <div className="flex items-center gap-3 flex-shrink-0">
                {currentUser && (
                  <GroupSelector
                    groups={groups}
                    selectedGroup={selectedGroup}
                    onSelectGroup={selectGroup}
                    onCreateGroup={() => setShowCreateGroup(true)}
                    loading={loadingGroups}
                    error={groupError}
                    isAdmin={isAdmin}
                  />
                )}
                
                {currentUser ? (
                  <UserDropdown 
                    onProfileClick={() => setActiveView('profile')} 
                    onUserManagementClick={() => setActiveView('users')}
                    onGroupMembersClick={() => setActiveView('groups')}
                    selectedGroup={selectedGroup}
                    upcomingGames={upcomingGames}
                    onRSVPChange={handleRSVPChange}
                  />
                ) : (
                  <AuthButtons 
                    onShowUserAuth={() => setShowUserAuth(true)}
                  />
                )}
              </div>
            </div>
          )}
          
          {currentUser && groups.length === 0 && !loadingGroups && (
            <div className="mt-6 max-w-md mx-auto text-center">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 mb-4">
                  You're not a member of any groups yet.
                </p>
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
                >
                  Create Your First Group
                </button>
              </div>
            </div>
          )}
          
          {/* Status indicators */}
          <div className="flex justify-center items-center gap-4 mt-4">
            {gamesError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm">
                {gamesError}
            <button
                  onClick={() => setGamesError('')}
                  className="ml-2 text-red-500 hover:text-red-700"
            >
                  <X className="w-4 h-4 inline" />
            </button>
              </div>
            )}
          </div>
        </div>

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
        {(selectedGroup?.userRole === 'owner' || isAdmin) && activeView === 'groups' && (
          <div className="mb-8">
            <GroupManagement 
              selectedGroup={selectedGroup}
              onClose={() => setActiveView('games')}
            />
              </div>
            )}

        {/* Games View */}
        {activeView === 'games' && (
          <>
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
        <div className="bg-white rounded-lg shadow-lg mb-8">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">Group Leaderboard</h2>
            </div>
          </div>
          
          {/* Desktop Table View */}
          {!isMobile && (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <SortableHeader field="rank" sticky={true} sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>
                    Rank
                  </SortableHeader>
                  <SortableHeader field="player" sticky={true} stickyLeft="left-12" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>
                    Player
                  </SortableHeader>
                  <SortableHeader field="points" align="text-center" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>
                    Points
                  </SortableHeader>
                  <SortableHeader field="games" align="text-center" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>
                    Games
                  </SortableHeader>
                  <SortableHeader field="winRate" align="text-center" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>
                    Win Rate
                  </SortableHeader>
                  <SortableHeader field="avgPosition" align="text-center" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>
                    Avg Pos
                  </SortableHeader>
                  <SortableHeader field="currentStreak" align="text-center" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>
                    Streak
                  </SortableHeader>
                  <SortableHeader field="bestHandWinCount" align="text-center" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>
                    Best Hand Wins
                  </SortableHeader>
                  <SortableHeader field="winnings" align="text-center" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>
                    Total Winnings
                  </SortableHeader>
                  <SortableHeader field="netWinnings" align="text-center" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>
                    P&L
                  </SortableHeader>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {standingsLoading ? (
                  <tr>
                    <td colSpan="10" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <div className="text-gray-500">Loading standings...</div>
                      </div>
                    </td>
                  </tr>
                ) : standings.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="px-6 py-12 text-center text-gray-500">
                      No games found for this group. Add some games to see standings!
                    </td>
                  </tr>
                ) : standings.map((player) => {
                  const getRowColorClass = () => {
                    if (player.rank === 1) return 'bg-gradient-to-r from-yellow-100 to-yellow-50 hover:from-yellow-200 hover:to-yellow-100';
                    if (player.rank === 2) return 'bg-gradient-to-r from-slate-200 to-slate-100 hover:from-slate-300 hover:to-slate-200';
                    return 'hover:bg-gray-50';
                  };
                  
                  const getStickyBgClass = () => {
                    if (player.rank === 1) return 'bg-gradient-to-r from-yellow-100 to-yellow-50';
                    if (player.rank === 2) return 'bg-gradient-to-r from-slate-200 to-slate-100';
                    return 'bg-white';
                  };

                  return (
                    <tr key={player.player} className={getRowColorClass()}>
                      <td className={`px-4 py-3 text-left font-bold sticky left-0 z-10 shadow-sm border-r ${getStickyBgClass()}`}>
                        <div className="flex items-center gap-1">
                          {player.rank === 1 && <Trophy className="w-4 h-4 text-yellow-600" />}
                          {player.rank}
                        </div>
                      </td>
                      <td className={`px-4 py-3 text-left font-medium sticky left-12 z-10 shadow-sm border-r ${getStickyBgClass()}`}>
                        <div className="flex items-center gap-1">
                          {player.player}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-blue-600">{player.points}</td>
                      <td className="px-4 py-3 text-center">{player.games}</td>
                      <td className="px-4 py-3 text-center">
                        {player.winRate.toFixed(1)}%
                        <div className="text-xs text-gray-500">{player.wins}W - {player.games - player.wins}L</div>
                      </td>
                      <td className="px-4 py-3 text-center">{player.avgPosition.toFixed(1)}</td>
                      <td className="px-4 py-3 text-center">
                        {player.streakType === 'win' ? (
                          <span className="text-green-600 font-semibold">W{player.currentStreak}</span>
                        ) : player.streakType === 'loss' ? (
                          <span className="text-red-600 font-semibold">L{player.currentStreak}</span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="font-semibold text-purple-600">{player.bestHandWinCount}</div>
                        <div className="text-xs text-gray-500">Participated: {player.bestHandParticipationCount} times</div>
                      </td>
                      <td className={`px-4 py-3 text-center font-semibold ${player.winnings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${player.winnings.toFixed(2)}
                      </td>
                      <td className={`px-4 py-3 text-center font-semibold ${player.netWinnings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${player.netWinnings.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}

          {/* Mobile Card View */}
          {isMobile && (
          <div>
            {standingsLoading ? (
              <div className="px-6 py-12 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <div className="text-gray-500">Loading standings...</div>
                </div>
              </div>
            ) : standings.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                No games found for this group. Add some games to see standings!
              </div>
            ) : standings.map((player) => {
              const isExpanded = expandedRows.has(player.userId);
              const getCardColorClass = () => {
                if (player.rank === 1) return 'bg-gradient-to-r from-yellow-100 to-yellow-50 border-yellow-200';
                if (player.rank === 2) return 'bg-gradient-to-r from-slate-200 to-slate-100 border-slate-300';
                return 'bg-white border-gray-200';
              };

              return (
                <div key={player.player} className={`border-b last:border-b-0 ${getCardColorClass()}`}>
                  <div 
                    className="p-4 cursor-pointer hover:bg-opacity-80 transition-colors"
                    onClick={() => toggleRowExpanded(player.userId)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex items-center gap-1">
                          {player.rank === 1 && <Trophy className="w-5 h-5 text-yellow-600" />}
                          <span className="font-bold text-lg">#{player.rank}</span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-800">{player.player}</div>
                          <div className="text-sm text-gray-600">{player.games} games</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="font-semibold text-blue-600 text-lg">{player.points}</div>
                          <div className="text-xs text-gray-500">points</div>
                        </div>
                        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-200 bg-white bg-opacity-50">
                      <div className="grid grid-cols-2 gap-4 pt-4">
                        <div className="text-center">
                          <div className="text-sm text-gray-500">Win Rate</div>
                          <div className="font-semibold">{player.winRate.toFixed(1)}%</div>
                          <div className="text-xs text-gray-400">{player.wins}W - {player.games - player.wins}L</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-500">Avg Position</div>
                          <div className="font-semibold">{player.avgPosition.toFixed(1)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-500">Current Streak</div>
                          {player.streakType === 'win' ? (
                            <div className="text-green-600 font-semibold">W{player.currentStreak}</div>
                          ) : player.streakType === 'loss' ? (
                            <div className="text-red-600 font-semibold">L{player.currentStreak}</div>
                          ) : (
                            <div className="text-gray-500">-</div>
                          )}
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-500">Best Hand Wins</div>
                          <div className="font-semibold text-purple-600">{player.bestHandWinCount}</div>
                          <div className="text-xs text-gray-400">of {player.bestHandParticipationCount}</div>
                        </div>
                        <div className="text-center col-span-1">
                          <div className="text-sm text-gray-500">Total Winnings</div>
                          <div className={`font-semibold ${player.winnings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${player.winnings.toFixed(2)}
                          </div>
                        </div>
                        <div className="text-center col-span-1">
                          <div className="text-sm text-gray-500">P&L</div>
                          <div className={`font-semibold ${player.netWinnings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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

        {/* Upcoming Games */}
        {selectedGroup && filteredGames.some(game => isGameScheduled(game)) && (
          <div className="bg-white rounded-lg shadow-lg mb-8">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <Calendar className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-semibold text-gray-800">
                  Upcoming Games - {selectedGroup.name}
                </h2>
              </div>
            </div>
            
            <div className="divide-y divide-gray-200">
              {filteredGames
                .filter(game => isGameScheduled(game))
                .sort((a, b) => {
                  // Sort upcoming games by date/time (earliest first)
                  const aDateTime = new Date(`${a.date}T${a.time || '00:00'}:00.000Z`);
                  const bDateTime = new Date(`${b.date}T${b.time || '00:00'}:00.000Z`);
                  return aDateTime - bDateTime;
                })
                .map((game) => (
                <div key={game.id} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {formatGameDateTime(game)}
                      <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        Scheduled
                      </span>
                    </h3>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <DollarSign className="w-4 h-4" />
                      Scheduled
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      {game.results.length} invited
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <LoadingButton
                      onClick={() => handleSendInvitations(game.id)}
                      loading={sendingNotifications}
                      disabled={!isAuthenticated}
                      className={`px-3 py-1 text-sm rounded-lg ${
                        isAuthenticated 
                          ? 'bg-green-600 text-white hover:bg-green-700' 
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                      title={isAuthenticated ? "Send game invitations" : "Please login to send invitations"}
                    >
                      Send Invitations
                    </LoadingButton>
          <button
                      onClick={() => isAuthenticated && startEditingGame(game)}
                      className={`p-2 rounded-lg ${
                        isAuthenticated 
                          ? 'text-blue-600 hover:text-blue-800 hover:bg-blue-50' 
                          : 'text-gray-400 cursor-not-allowed'
                      }`}
                      disabled={!isAuthenticated}
                      title={isAuthenticated ? "Edit game" : "Please login to edit games"}
                    >
                      <Edit className="w-4 h-4" />
          </button>
                <button
                      onClick={() => isAuthenticated && deleteGame(game.id)}
                      className={`p-2 rounded-lg ${
                        isAuthenticated 
                          ? 'text-red-600 hover:text-red-800 hover:bg-red-50' 
                          : 'text-gray-400 cursor-not-allowed'
                      }`}
                      disabled={!isAuthenticated}
                      title={isAuthenticated ? "Delete game" : "Please login to delete games"}
                    >
                      <Trash2 className="w-4 h-4" />
                </button>
                  </div>
                </div>
                
                {/* Game RSVP table */}
                <div className="bg-gray-50 rounded p-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-300">
                          <th className="text-left py-2 px-3">Player</th>
                          <th className="text-center py-2 px-3">RSVP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {game.results
                          .slice()
                          .sort((a, b) => {
                            // Sort by RSVP status: yes, pending, no
                            const order = { yes: 0, pending: 1, no: 2 };
                            return (order[a.rsvpStatus] || 1) - (order[b.rsvpStatus] || 1);
                          })
                          .map((result, index) => {
                            const isCurrentUser = result.userId === currentUser?.userId;
                            return (
                              <tr key={index} className="border-b border-gray-200 last:border-b-0">
                                <td className="py-2 px-3 font-medium">{getUserDisplayName(result.userId)}</td>
                                <td className="py-2 px-3 text-center">
                                  {isCurrentUser ? (
                                    <select
                                      value={result.rsvpStatus || 'pending'}
                                      onChange={(e) => handleRSVPChange(game.id, e.target.value)}
                                      className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
                                    >
                                      <option value="yes">Yes</option>
                                      <option value="no">No</option>
                                      <option value="pending">Pending</option>
                                    </select>
                                  ) : (
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                      result.rsvpStatus === 'yes' ? 'bg-green-100 text-green-800' :
                                      result.rsvpStatus === 'no' ? 'bg-red-100 text-red-800' :
                                      result.rsvpStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {result.rsvpStatus || 'Pending'}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Games */}
        <div className="bg-white rounded-lg shadow-lg">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-green-600" />
              <h2 className="text-2xl font-semibold text-gray-800">
                Recent Games {selectedGroup ? `- ${selectedGroup.name}` : ''}
              </h2>
            </div>
          </div>
          
          <div className="divide-y divide-gray-200">
            {!selectedGroup ? (
              <div className="p-6 text-center">
                <p className="text-gray-500">Select a group to view games</p>
              </div>
            ) : filteredGames.filter(game => !isGameScheduled(game)).length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-500">No games recorded yet for {selectedGroup.name}</p>
                {currentUser && (
                  <p className="text-sm text-gray-400 mt-2">Add your first game to get started!</p>
                )}
              </div>
            ) : (
              filteredGames
                .filter(game => !isGameScheduled(game))
                .sort((a, b) => {
                  // Sort by date/time with most recent first
                  const aDateTime = new Date(`${a.date}T${a.time || '00:00'}:00.000Z`);
                  const bDateTime = new Date(`${b.date}T${b.time || '00:00'}:00.000Z`);
                  return bDateTime - aDateTime; // Most recent first
                })
                .map((game) => (
                <div key={game.id} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {formatGameDateTime(game)}
                    </h3>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <DollarSign className="w-4 h-4" />
                      ${game.results.reduce((sum, r) => sum + r.winnings, 0)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      {game.results.length} players
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <LoadingButton
                      onClick={() => handleSendResults(game.id)}
                      loading={sendingNotifications}
                      disabled={!isAuthenticated}
                      className={`px-3 py-1 text-sm rounded-lg ${
                        isAuthenticated 
                          ? 'bg-purple-600 text-white hover:bg-purple-700' 
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                      title={isAuthenticated ? "Send game results" : "Please login to send results"}
                    >
                      Send Results
                    </LoadingButton>
          <button
                      onClick={() => isAuthenticated && startEditingGame(game)}
                      className={`p-2 rounded-lg ${
                        isAuthenticated 
                          ? 'text-blue-600 hover:text-blue-800 hover:bg-blue-50' 
                          : 'text-gray-400 cursor-not-allowed'
                      }`}
                      disabled={!isAuthenticated}
                      title={isAuthenticated ? "Edit game" : "Please login to edit games"}
                    >
                      <Edit className="w-4 h-4" />
          </button>
                <button
                      onClick={() => isAuthenticated && deleteGame(game.id)}
                      className={`p-2 rounded-lg ${
                        isAuthenticated 
                          ? 'text-red-600 hover:text-red-800 hover:bg-red-50' 
                          : 'text-gray-400 cursor-not-allowed'
                      }`}
                      disabled={!isAuthenticated}
                      title={isAuthenticated ? "Delete game" : "Please login to delete games"}
                    >
                      <Trash2 className="w-4 h-4" />
                </button>
                  </div>
                </div>
                
                {/* Game results table */}
                <div className="bg-gray-50 rounded p-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-300">
                          {!isGameScheduled(game) && (
                            <th className="text-left py-2 px-3">Pos</th>
                          )}
                          <th className="text-left py-2 px-3">Player</th>
                          {!isGameScheduled(game) && (
                            <>
                              <th className="text-center py-2 px-3">Points</th>
                              <th className="text-center py-2 px-3">Winnings</th>
                              <th className="text-center py-2 px-3">Rebuys</th>
                              <th className="text-center py-2 px-3">Best Hand</th>
                            </>
                          )}
                          {isGameScheduled(game) && (
                            <th className="text-center py-2 px-3">RSVP</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {game.results
                          .slice()
                          .sort((a, b) => a.position - b.position)
                          .map((result, index) => {
                            const points = calculatePoints(game.results, result);
                            const getRowColorClass = () => {
                              if (result.position === 1) return 'bg-gradient-to-r from-yellow-100 to-yellow-50 border-b border-gray-200 last:border-b-0';
                              if (result.position === 2) return 'bg-gradient-to-r from-slate-200 to-slate-100 border-b border-gray-200 last:border-b-0';
                              return 'border-b border-gray-200 last:border-b-0';
                            };
                            return (
                              <tr key={index} className={getRowColorClass()}>
                                {!isGameScheduled(game) && (
                                  <td className="py-2 px-3 font-medium">
                                    <div className="flex items-center gap-1">
                                      {result.position === 1 && <Trophy className="w-3 h-3 text-yellow-600" />}
                                      #{result.position}
                                    </div>
                                  </td>
                                )}
                                <td className="py-2 px-3 font-medium">{getUserDisplayName(result.userId)}</td>
                                {!isGameScheduled(game) && (
                                  <>
                                    <td className="py-2 px-3 text-center text-blue-600 font-semibold">
                                      {points.toFixed(1)}
                                    </td>
                                    <td className={`py-2 px-3 text-center font-medium ${
                                      result.winnings >= 0 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                      ${result.winnings.toFixed(0)}
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                      {result.rebuys > 0 ? result.rebuys : '-'}
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                      {result.bestHandWinner ? (
                                        <span className="text-purple-600 font-semibold">Won</span>
                                      ) : result.bestHandParticipant ? (
                                        <span className="text-gray-600">Played</span>
                                      ) : (
                                        '-'
                                      )}
                                    </td>
                                  </>
                                )}
                                {isGameScheduled(game) && (
                                  <td className="py-2 px-3 text-center">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                      result.rsvpStatus === 'yes' ? 'bg-green-100 text-green-800' :
                                      result.rsvpStatus === 'no' ? 'bg-red-100 text-red-800' :
                                      result.rsvpStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {result.rsvpStatus || 'Pending'}
                                    </span>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              ))
            )}
          </div>
            </div>
            
      {/* Game Form Modal */}
      {showAddGame && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-screen overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {isEditing ? 'Edit Game' : 'Add New Game'}
            </h3>
            
            {/* Modal Error Display */}
            {gameFormError && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {gameFormError}
              </div>
            )}
            
            <form onSubmit={handleSaveGame}>
              {/* Basic game info */}
            <div className="space-y-4 mb-6">
              <div>
                  <label className="block text-sm font-medium mb-2">Date *</label>
                <input
                  type="date"
                    value={newGame.date}
                    onChange={(e) => updateGameData('date', e.target.value)}
                    className="w-full max-w-md border rounded px-4 py-3 text-base"
                  required
                />
              </div>
              <div>
                  <label className="block text-sm font-medium mb-2">Time</label>
                <input
                  type="time"
                    value={newGame.time || ''}
                    onChange={(e) => updateGameData('time', e.target.value)}
                    className="w-full max-w-md border rounded px-4 py-3 text-base"
                />
              </div>
              {isEditing && (
                <div>
                    <label className="block text-sm font-medium mb-2">Status</label>
                  <select
                    value={newGame.status || 'completed'}
                    onChange={(e) => updateGameData('status', e.target.value)}
                      className="w-full max-w-xs border rounded px-4 py-3 text-base"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Change to "Completed" to add results and include in leaderboard
                  </p>
                </div>
              )}
              {!isEditing && isGameInFuture(newGame.date, newGame.time) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Future Game:</strong> This game will be created as "Scheduled" for RSVP tracking. 
                    You can convert it to "Completed" later to add results.
                  </p>
                </div>
              )}
            </div>

              {/* Players - Only show if date is selected */}
              {newGame.date && (
                <>
                  <h4 className="font-semibold mb-3">
                    {(!isEditing && isGameInFuture(newGame.date, newGame.time)) || (isEditing && newGame.status === 'scheduled') ? 'Players & RSVP' : 'Players & Results'}
                  </h4>
                  {newGame.results.map((result, index) => (
                <div key={index} className="space-y-4 mb-6 p-4 bg-gray-50 rounded-lg border">
                <div>
                  <label className="block text-sm font-medium mb-2">Player *</label>
                    <PlayerInput
                      result={result}
                      index={index}
                      groupUsers={groupUsers}
                      allResults={newGame.results}
                      onPlayerChange={updatePlayerResult}
                      onAddStubUser={addStubUser}
                      loading={groupUsersLoading}
                  />
                </div>
                <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 ${((!isEditing && isGameInFuture(newGame.date, newGame.time)) || (isEditing && newGame.status === 'scheduled')) ? 'lg:grid-cols-2' : 'lg:grid-cols-5'}`}>
                {!((!isEditing && isGameInFuture(newGame.date, newGame.time)) || (isEditing && newGame.status === 'scheduled')) && (
                  <>
                    <div>
                        <label className="block text-sm font-medium mb-2">Position</label>
                      <input
                        type="number"
                        min="1"
                        value={result.position}
                        onChange={(e) => updatePlayerResult(index, 'position', e.target.value)}
                          className="w-full border rounded px-3 py-2 text-base"
                            required
                      />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Winnings ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={result.winnings}
                        onChange={(e) => updatePlayerResult(index, 'winnings', e.target.value)}
                          className="w-full border rounded px-3 py-2 text-base"
                      />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Rebuys</label>
                      <input
                        type="number"
                        min="0"
                        value={result.rebuys}
                        onChange={(e) => updatePlayerResult(index, 'rebuys', e.target.value)}
                          className="w-full border rounded px-3 py-2 text-base"
                      />
                    </div>
                    <div>
                          <label className="block text-sm font-medium mb-2">Best Hand</label>
                          <div className="space-y-2">
                            <label className="flex items-center text-sm">
                              <input
                                type="checkbox"
                                checked={result.bestHandParticipant}
                                onChange={(e) => updatePlayerResult(index, 'bestHandParticipant', e.target.checked)}
                                className="mr-2"
                              />
                              Participated
                            </label>
                            <label className="flex items-center text-sm">
                              <input
                                type="checkbox"
                                checked={result.bestHandWinner}
                                onChange={(e) => updatePlayerResult(index, 'bestHandWinner', e.target.checked)}
                                className="mr-2"
                              />
                              Won
                            </label>
                          </div>
                        </div>
                  </>
                )}
                {((!isEditing && isGameInFuture(newGame.date, newGame.time)) || (isEditing && newGame.status === 'scheduled')) && (
                  <div>
                      <label className="block text-sm font-medium mb-2">RSVP Status</label>
                    <select
                      value={result.rsvpStatus || 'pending'}
                      onChange={(e) => updatePlayerResult(index, 'rsvpStatus', e.target.value)}
                        className="w-full border rounded px-3 py-2 text-base"
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                )}
                    <div className="flex items-end">
                      {newGame.results.length > 1 && (
                  <button
                          type="button"
                          onClick={() => removePlayerFromGame(index)}
                          className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded"
                  >
                    Remove
                  </button>
                      )}
                  </div>
                </div>
              </div>
            ))}

                  <button
                    type="button"
                    onClick={addPlayerToGame}
                    className="mb-4 text-blue-600 hover:text-blue-800 text-sm underline"
                  >
                    + Add Player
                  </button>
                </>
              )}

              {/* Form buttons */}
            <div className="flex gap-2 justify-end">
              <button
                  type="button"
                  onClick={closeForm}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
                <LoadingButton
                  loading={gamesLoading}
                  className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {isEditing ? 'Update Game' : 'Save Game'}
                </LoadingButton>
            </div>
            </form>
            </div>
          </div>
      )}
      </>
    )}

        {/* Modals */}
        <LoginModal
          show={showUserAuth}
          onClose={() => setShowUserAuth(false)}
          loading={authLoading}
          onSubmit={handleUserAuthSubmit}
        />

        {/* Create Group Modal */}
        {showCreateGroup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="flex justify-between items-center p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">Create New Group</h3>
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
    description: ''
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
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
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
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
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
