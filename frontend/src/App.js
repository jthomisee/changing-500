import React, { useEffect, useState } from 'react';
import { Trophy, Plus, DollarSign, Calendar, Users, TrendingUp, Edit, Trash2, X, Save, Settings } from 'lucide-react';

// Context and Hooks
import { AuthProvider, useAuth } from './context/AuthContext';
import { useGames } from './hooks/useGames';
import { useStandings } from './hooks/useStandings';
import { useGameForm } from './hooks/useGameForm';
import { useUsers } from './hooks/useUsers';

// Components
import AuthButtons from './components/auth/AuthButtons';
import LoginModal from './components/auth/LoginModal';
import LoadingButton from './components/common/LoadingButton';
import SortableHeader from './components/common/SortableHeader';
import PlayerInput from './components/games/PlayerInput';
import UserManagement from './components/admin/UserManagement';

// Utils
import { calculatePoints } from './utils/gameUtils';

// Styles
import './App.css';

// Main App Component (wrapped with AuthProvider)
const DealinHoldenApp = () => {
  return (
    <AuthProvider>
      <DealinHolden />
    </AuthProvider>
  );
};

// Core App Component
const DealinHolden = () => {
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

  // Standings
  const {
    standings,
    sortField,
    sortDirection,
    handleSort,
    getSortIcon
  } = useStandings(games);

  // Game Form
  const {
    showAddGame,
    editingGame,
    newGame,
    openAddGame,
    startEditingGame,
    closeForm,
    updateGameData,
    addPlayerToGame,
    removePlayerFromGame,
    updatePlayerResult,
    isEditing
  } = useGameForm();

  // User Search
  const {
    availableUsers,
    searchForUsers,
    clearUsers
  } = useUsers();

  // Local state for modals and views
  const [showUserAuth, setShowUserAuth] = useState(false);
  const [activeView, setActiveView] = useState('games'); // 'games' or 'users'

  // Load games on mount
  useEffect(() => {
    loadAllGames();
  }, [loadAllGames]);

  // Authentication handlers
  const handleUserAuthSubmit = async (mode, formData) => {
    try {
      if (mode === 'register') {
        const { email, password, confirmPassword, firstName, lastName, phone } = formData;
        if (!email || !password || !firstName || !lastName) {
          alert('Please fill in all required fields');
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
          // Auto-login after successful registration
          const loginResult = await handleUserLogin(email, password);
          if (loginResult.success) {
            setShowUserAuth(false);
            // Reload data to show user's games
            loadAllGames();
            alert('Registration successful! You are now logged in.');
            return;
          } else {
            alert('Registration successful! Please login manually.');
            return;
          }
        } else {
          alert(`Registration failed: ${result.error}`);
        }
      } else {
        const { email, password } = formData;
        if (!email || !password) {
          alert('Please enter email and password');
          return;
        }

        const result = await handleUserLogin(email, password);

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

  // Game form handlers
  const handleSaveGame = async (e) => {
    e.preventDefault();
    
    try {
      if (isEditing) {
        await updateGame(editingGame.id, newGame);
      } else {
        await saveGame(newGame);
      }
      closeForm();
    } catch (error) {
      setGamesError('Failed to save game: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-3">
            <Trophy className="w-10 h-10 text-yellow-500" />
            Dealin Holden
          </h1>
          <p className="text-gray-600">Track games, winnings, and season standings</p>
          
          {/* Authentication */}
          <div className="flex justify-center items-center gap-4 mt-4">
            <AuthButtons
              currentUser={currentUser}
              isAdmin={isAdmin}
              onUserLogout={handleUserLogout}
              onShowUserAuth={() => setShowUserAuth(true)}
            />
          </div>

          {/* Admin Navigation */}
          {isAdmin && (
            <div className="flex justify-center items-center gap-2 mt-4">
              <button
                onClick={() => setActiveView('games')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeView === 'games'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Calendar className="w-4 h-4 inline mr-2" />
                Games
              </button>
              <button
                onClick={() => setActiveView('users')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeView === 'users'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Settings className="w-4 h-4 inline mr-2" />
                User Management
              </button>
            </div>
          )}
          
          {/* Status indicators */}
          <div className="flex justify-center items-center gap-4 mt-4">
            <LoadingButton
              loading={gamesLoading}
              onClick={loadAllGames}
              className="text-gray-600 hover:text-gray-800 text-sm underline"
            >
              Refresh Data
            </LoadingButton>
            
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

        {/* Admin User Management View */}
        {isAdmin && activeView === 'users' && (
          <div className="mb-8">
            <UserManagement />
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

        {/* Season Standings */}
        <div className="bg-white rounded-lg shadow-lg mb-8">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-semibold text-gray-800">Season Standings</h2>
            </div>
          </div>
          
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
                  <SortableHeader 
                    field="points" 
                    align="text-center"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    Points
                  </SortableHeader>
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
                    Win Rate
                  </SortableHeader>
                  <SortableHeader 
                    field="avgPosition" 
                    align="text-center"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    Avg Pos
                  </SortableHeader>
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
                {standings.map((player) => {
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
                          {player.rank === 1 && <Trophy className="w-4 h-4 text-yellow-600" />}
                          {player.player}
                        </div>
                      </td>
                    <td className="px-4 py-3 text-center font-semibold text-blue-600">
                      {player.points}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {player.games}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {player.winRate.toFixed(1)}%
                      <div className="text-xs text-gray-500">
                        {player.wins}W - {player.games - player.wins}L
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {player.avgPosition.toFixed(1)}
                    </td>
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
                      <div className="font-semibold text-purple-600">{player.bestHandWinCount}</div>
                      <div className="text-xs text-gray-500">
                        Participated: {player.bestHandParticipationCount} times
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-center font-semibold ${
                      player.winnings >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ${player.winnings.toFixed(2)}
                    </td>
                    <td className={`px-4 py-3 text-center font-semibold ${
                      player.netWinnings >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ${player.netWinnings.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Games */}
        <div className="bg-white rounded-lg shadow-lg">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-green-600" />
              <h2 className="text-2xl font-semibold text-gray-800">Recent Games</h2>
            </div>
          </div>
          
          <div className="divide-y divide-gray-200">
            {games.slice().reverse().map((game) => (
              <div key={game.id} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">Game #{game.gameNumber}</h3>
                    <p className="text-gray-600">{game.date}</p>
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
                          <th className="text-left py-2 px-3">Pos</th>
                          <th className="text-left py-2 px-3">Player</th>
                          <th className="text-center py-2 px-3">Points</th>
                          <th className="text-center py-2 px-3">Winnings</th>
                          <th className="text-center py-2 px-3">Rebuys</th>
                          <th className="text-center py-2 px-3">Best Hand</th>
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
                                <td className="py-2 px-3 font-medium">
                                  <div className="flex items-center gap-1">
                                    {result.position === 1 && <Trophy className="w-3 h-3 text-yellow-600" />}
                                    #{result.position}
                                  </div>
                                </td>
                                <td className="py-2 px-3 font-medium">{result.player}</td>
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
      </div>

      {/* Game Form Modal */}
      {showAddGame && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-screen overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {isEditing ? 'Edit Game' : 'Add New Game'}
            </h3>
            
            <form onSubmit={handleSaveGame}>
              {/* Basic game info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Date *</label>
                  <input
                    type="date"
                    value={newGame.date}
                    onChange={(e) => updateGameData('date', e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Game Number</label>
                  <input
                    type="number"
                    value={newGame.gameNumber}
                    onChange={(e) => updateGameData('gameNumber', parseInt(e.target.value) || 1)}
                    className="w-full border rounded px-3 py-2"
                    min="1"
                  />
                </div>
              </div>

              {/* Players */}
              <h4 className="font-semibold mb-3">Players & Results</h4>
              {newGame.results.map((result, index) => (
                <div key={index} className="grid grid-cols-1 lg:grid-cols-6 gap-2 mb-3 p-3 bg-gray-50 rounded">
                  <div>
                    <label className="block text-xs font-medium mb-1">Player *</label>
                    <PlayerInput
                      result={result}
                      index={index}
                      availableUsers={availableUsers}
                      isAuthenticated={isAuthenticated}
                      onPlayerChange={updatePlayerResult}
                      onUserSearch={searchForUsers}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Position</label>
                    <input
                      type="number"
                      min="1"
                      value={result.position}
                      onChange={(e) => updatePlayerResult(index, 'position', e.target.value)}
                      className="w-full border rounded px-2 py-1 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Winnings ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={result.winnings}
                      onChange={(e) => updatePlayerResult(index, 'winnings', e.target.value)}
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Rebuys</label>
                    <input
                      type="number"
                      min="0"
                      value={result.rebuys}
                      onChange={(e) => updatePlayerResult(index, 'rebuys', e.target.value)}
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Best Hand</label>
                    <div className="space-y-1">
                      <label className="flex items-center text-xs">
                        <input
                          type="checkbox"
                          checked={result.bestHandParticipant}
                          onChange={(e) => updatePlayerResult(index, 'bestHandParticipant', e.target.checked)}
                          className="mr-1"
                        />
                        Participated
                      </label>
                      <label className="flex items-center text-xs">
                        <input
                          type="checkbox"
                          checked={result.bestHandWinner}
                          onChange={(e) => updatePlayerResult(index, 'bestHandWinner', e.target.checked)}
                          className="mr-1"
                        />
                        Won
                      </label>
                    </div>
                  </div>
                  <div className="text-right">
                    {newGame.results.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePlayerFromGame(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    )}
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
      </div>
    </div>
  );
};

export default DealinHoldenApp;
