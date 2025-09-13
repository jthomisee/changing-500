import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trophy, DollarSign, Calendar, Users, TrendingUp, Save, RefreshCw, Edit, X, Trash2, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import './App.css';

const DealinHolden = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAddGame, setShowAddGame] = useState(false);
  const [editingGame, setEditingGame] = useState(null);
  const [newGame, setNewGame] = useState({
    date: '',
    gameNumber: 1,
    results: [{ player: '', position: 1, winnings: 0, rebuys: 0, bestHandParticipant: false, bestHandWinner: false }]
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [jwtToken, setJwtToken] = useState(null);
  const [sortField, setSortField] = useState('points');
  const [sortDirection, setSortDirection] = useState('desc');
  
  // User authentication state
  const [currentUser, setCurrentUser] = useState(null);
  const [userToken, setUserToken] = useState(null);
  const [showUserAuth, setShowUserAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [userAuthForm, setUserAuthForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: ''
  });
  const [availableUsers, setAvailableUsers] = useState([]);

  // AWS API Configuration
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://your-api-gateway-url.amazonaws.com';

  // API helper functions
  const apiCall = async (endpoint, options = {}) => {
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers
      };

      // Add JWT token to headers for authenticated requests
      const token = jwtToken || userToken;
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers,
        ...options
      });

      // Handle 401 Unauthorized - token expired or invalid
      if (response.status === 401) {
        handleTokenExpired();
        throw new Error('Authentication required');
      }

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.error('API call failed:', err);
      throw err;
    }
  };

  // Load games from database
  const loadGames = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiCall('/games');
      setGames(data.games || []);
    } catch (err) {
      setError('Failed to load games.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Save game to database
  const saveGameToDB = async (gameData) => {
    setLoading(true);
    try {
      const response = await apiCall('/games', {
        method: 'POST',
        body: JSON.stringify(gameData)
      });
      return response;
    } catch (err) {
      throw new Error('Failed to save game to database');
    } finally {
      setLoading(false);
    }
  };

  // Update game in database
  const updateGameInDB = async (gameId, gameData) => {
    setLoading(true);
    try {
      const response = await apiCall(`/games/${gameId}`, {
        method: 'PUT',
        body: JSON.stringify(gameData)
      });
      return response;
    } catch (err) {
      throw new Error('Failed to update game in database');
    } finally {
      setLoading(false);
    }
  };

  // Delete game from database
  const deleteGameFromDB = async (gameId) => {
    setLoading(true);
    try {
      const response = await apiCall(`/games/${gameId}`, {
        method: 'DELETE'
      });
      return response;
    } catch (err) {
      throw new Error('Failed to delete game from database');
    } finally {
      setLoading(false);
    }
  };

  // Initialize app
  useEffect(() => {
    loadGames();
  }, [loadGames]);

  // Check for existing JWT session on app load
  useEffect(() => {
    const session = getJwtSession();
    if (session && session.token) {
      setJwtToken(session.token);
      setIsAdmin(true);
    }
  }, []);

  // Check for existing user session on app load
  useEffect(() => {
    const session = getUserSession();
    if (session && session.token) {
      setUserToken(session.token);
      // We don't have user info stored, so we'll need to fetch it or include it in session
      // For now, just set a basic user object - we can improve this later
      setCurrentUser({ token: session.token });
    }
  }, []);

  // Periodically check if JWT token has expired
  useEffect(() => {
    if (!isAdmin || !jwtToken) return;

    const checkTokenExpiration = () => {
      const session = getJwtSession();
      if (!session || !session.token) {
        // Token expired, logout
        handleTokenExpired();
      }
    };

    // Check every minute
    const intervalId = setInterval(checkTokenExpiration, 60000);

    return () => clearInterval(intervalId);
  }, [isAdmin, jwtToken]);

  // Calculate points for a player's position in a game
  const calculatePoints = (results, playerResult) => {
    const totalPlayers = results.length;
    const position = playerResult.position;
    
    // Check if there's a tie at this position
    const playersAtPosition = results.filter(r => r.position === position);
    
    if (playersAtPosition.length > 1) {
      // Handle ties - divide points equally
      const basePoints = totalPlayers - position;
      return basePoints / playersAtPosition.length;
    } else {
      // No tie
      return totalPlayers - position;
    }
  };

  // Get season standings
  const getSeasonStandings = () => {
    const playerStats = {};
    
    // Sort games chronologically for streak calculations
    const sortedGames = [...games].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // First pass: collect basic stats and player game history
    sortedGames.forEach(game => {
      // Calculate side bet winnings for this game (split among winners)
      const bestHandParticipants = game.results.filter(r => r.bestHandParticipant);
      const bestHandWinners = game.results.filter(r => r.bestHandWinner);
      const bestHandPot = bestHandParticipants.length * 5; // $5 per participant
      const bestHandWinningsPerWinner = bestHandWinners.length > 0 ? bestHandPot / bestHandWinners.length : 0;

      game.results.forEach(result => {
        if (!playerStats[result.player]) {
          playerStats[result.player] = {
            games: 0,
            points: 0,
            winnings: 0,
            rebuys: 0,
            totalBuyins: 0,
            wins: 0,
            positions: [],
            gameHistory: [], // Track game participation for streaks
            totalPlayers: [], // Track total players in each game for finish position calculation
            bestHandWinnings: 0,
            bestHandCosts: 0,
            bestHandWinCount: 0,
            bestHandParticipationCount: 0
          };
        }
        
        playerStats[result.player].games++;
        playerStats[result.player].points += calculatePoints(game.results, result);
        playerStats[result.player].winnings += result.winnings;
        playerStats[result.player].totalBuyins += 20; // Base buyin
        playerStats[result.player].positions.push(result.position);
        playerStats[result.player].totalPlayers.push(game.results.length);
        playerStats[result.player].gameHistory.push({
          date: game.date,
          position: result.position,
          isWin: result.position === 1,
          totalPlayers: game.results.length
        });
        
        if (result.position === 1) {
          playerStats[result.player].wins++;
        }
        
        if (result.rebuys > 0) {
          playerStats[result.player].rebuys += result.rebuys;
          playerStats[result.player].totalBuyins += (result.rebuys * 20); // Rebuy cost
        }

        // Handle side bet (with backward compatibility for existing games)
        if (result.bestHandParticipant === true) {
          playerStats[result.player].bestHandParticipationCount += 1; // Count participation
          playerStats[result.player].bestHandCosts += 5;
          playerStats[result.player].totalBuyins += 5; // Add to total costs
        }

        if (result.bestHandWinner === true) {
          playerStats[result.player].bestHandWinCount += 1; // Count the win
          if (bestHandWinningsPerWinner > 0) {
            playerStats[result.player].bestHandWinnings += bestHandWinningsPerWinner;
            playerStats[result.player].winnings += bestHandWinningsPerWinner; // Add to total winnings
          }
        }
      });
    });

    // Calculate streaks and additional stats
    Object.keys(playerStats).forEach(player => {
      const stats = playerStats[player];
      const history = stats.gameHistory;
      
      // Calculate win rate
      stats.winRate = stats.games > 0 ? (stats.wins / stats.games * 100) : 0;
      
      // Calculate average finish position
      stats.avgFinishPosition = stats.positions.length > 0 
        ? stats.positions.reduce((sum, pos) => sum + pos, 0) / stats.positions.length 
        : 0;
      
      // Calculate current win/lose streak
      let currentStreak = 0;
      let streakType = null; // 'win' or 'lose'
      
      for (let i = history.length - 1; i >= 0; i--) {
        const game = history[i];
        if (i === history.length - 1) {
          // Start with the most recent game
          streakType = game.isWin ? 'win' : 'lose';
          currentStreak = 1;
        } else {
          // Continue if streak type matches, break if different
          if ((streakType === 'win' && game.isWin) || (streakType === 'lose' && !game.isWin)) {
            currentStreak++;
          } else {
            break;
          }
        }
      }
      
      stats.currentStreak = currentStreak || 0;
      stats.streakType = streakType;
      
      
      // Clean up temporary arrays
      delete stats.positions;
      delete stats.gameHistory;
      delete stats.totalPlayers;
    });

    return Object.entries(playerStats)
      .map(([player, stats]) => ({ 
        player, 
        ...stats,
        netWinnings: stats.winnings - stats.totalBuyins
      }))
      .sort((a, b) => b.points - a.points);
  };

  // Sorting functions
  const handleSort = (field) => {
    if (sortField === field) {
      // If clicking the same field, toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // If clicking a new field, set it as sort field with descending as default
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortedStandings = () => {
    const standings = getSeasonStandings();
    
    // First, calculate ranks based on points (always descending - highest points = rank 1)
    const pointsSorted = [...standings].sort((a, b) => b.points - a.points);
    
    let currentRank = 1;
    let previousPoints = null;
    
    const standingsWithRanks = pointsSorted.map((player, index) => {
      if (index === 0) {
        // First player always gets rank 1
        currentRank = 1;
        previousPoints = player.points;
      } else {
        // Check if this player has the same points as previous (tie)
        if (Math.abs(player.points - previousPoints) < 0.001) {
          // Same points as previous player (tie) - keep same rank
          // Don't increment currentRank
        } else {
          // Different points - increment to next rank (consecutive, no gaps)
          currentRank++;
        }
        previousPoints = player.points;
      }
      
      return {
        ...player,
        rank: currentRank
      };
    });

    // Then sort by the requested field and direction for display
    return standingsWithRanks.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      // Handle string sorting (player names)
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      // Handle sorting direction
      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  };

  const addPlayerToGame = () => {
    const gameToUpdate = editingGame || newGame;
    const updatedGame = {
      ...gameToUpdate,
      results: [...gameToUpdate.results, { 
        player: '', 
        position: gameToUpdate.results.length + 1, 
        winnings: 0, 
        rebuys: 0,
        bestHandParticipant: false,
        bestHandWinner: false
      }]
    };
    
    if (editingGame) {
      setEditingGame(updatedGame);
    } else {
      setNewGame(updatedGame);
    }
  };

  const updatePlayerResult = (index, field, value) => {
    const gameToUpdate = editingGame || newGame;
    const updatedResults = [...gameToUpdate.results];
    
    // Handle different field types
    if (field === 'winnings' || field === 'position' || field === 'rebuys') {
      updatedResults[index][field] = Number(value);
    } else if (field === 'bestHandParticipant' || field === 'bestHandWinner') {
      updatedResults[index][field] = Boolean(value);
    } else {
      updatedResults[index][field] = value;
    }
    
    if (editingGame) {
      setEditingGame({ ...editingGame, results: updatedResults });
    } else {
      setNewGame({ ...newGame, results: updatedResults });
    }
  };

  const removePlayer = (index) => {
    const gameToUpdate = editingGame || newGame;
    if (gameToUpdate.results.length > 1) {
      const updatedResults = gameToUpdate.results.filter((_, i) => i !== index);
      // Adjust positions
      updatedResults.forEach((result, i) => {
        if (result.position > index + 1) {
          result.position--;
        }
      });
      
      if (editingGame) {
        setEditingGame({ ...editingGame, results: updatedResults });
      } else {
        setNewGame({ ...newGame, results: updatedResults });
      }
    }
  };

  const startEditingGame = (game) => {
    // Ensure backward compatibility by adding side bet fields to existing games
    const updatedGame = {
      ...game,
      results: game.results.map(result => ({
        ...result,
        bestHandParticipant: result.bestHandParticipant || false,
        bestHandWinner: result.bestHandWinner || false
      }))
    };
    setEditingGame(updatedGame);
    setShowAddGame(true);
  };

  const cancelEdit = () => {
    setEditingGame(null);
    setShowAddGame(false);
  };

  // Admin authentication functions
  const validateAdminPassword = async (inputPassword) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password: inputPassword })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Password validation failed:', error);
      return { valid: false, error: error.message };
    }
  };
  
  const handleAdminLogin = async () => {
    if (!adminPassword.trim()) {
      alert('Please enter a password');
      return;
    }
    
    setLoading(true);
    try {
      const result = await validateAdminPassword(adminPassword);
      if (result.valid && result.token) {
        setJwtToken(result.token);
        setIsAdmin(true);
        setShowAdminLogin(false);
        setAdminPassword('');
        setJwtSession(result.token, result.expiresIn); // Save JWT to localStorage
      } else {
        alert('Incorrect password');
        setAdminPassword('');
      }
    } catch (error) {
      alert('Failed to validate password');
      setAdminPassword('');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAdminLogout = () => {
    setIsAdmin(false);
    setJwtToken(null);
    setShowAddGame(false);
    setEditingGame(null);
    clearJwtSession();
  };

  const handleTokenExpired = () => {
    setIsAdmin(false);
    setJwtToken(null);
    setShowAddGame(false);
    setEditingGame(null);
    clearJwtSession();
    alert('Your session has expired. Please login again.');
  };

  // JWT session management functions
  const setJwtSession = (token, expiresInSeconds) => {
    const expirationTime = Date.now() + (expiresInSeconds * 1000);
    localStorage.setItem('jwtSession', JSON.stringify({
      token: token,
      expiresAt: expirationTime
    }));
  };

  const getJwtSession = () => {
    try {
      const session = localStorage.getItem('jwtSession');
      if (!session) return null;
      
      const { token, expiresAt } = JSON.parse(session);
      
      // Check if token has expired
      if (Date.now() > expiresAt) {
        clearJwtSession();
        return null;
      }
      
      return { token, expiresAt };
    } catch (error) {
      console.error('Error reading JWT session:', error);
      clearJwtSession();
      return null;
    }
  };

  const clearJwtSession = () => {
    localStorage.removeItem('jwtSession');
  };

  // User Authentication Functions
  const registerUser = async (userData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Registration failed');
      }

      const data = await response.json();
      return { success: true, user: data.user };
    } catch (error) {
      console.error('Registration failed:', error);
      return { success: false, error: error.message };
    }
  };

  const loginUser = async (email, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const data = await response.json();
      return { success: true, user: data.user, token: data.token, expiresIn: data.expiresIn };
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: error.message };
    }
  };

  const handleUserAuth = async () => {
    if (authMode === 'register') {
      const { email, password, firstName, lastName, phone } = userAuthForm;
      if (!email || !password || !firstName || !lastName) {
        alert('Please fill in all required fields');
        return;
      }

      setLoading(true);
      const result = await registerUser({ email, password, firstName, lastName, phone });
      setLoading(false);

      if (result.success) {
        alert('Registration successful! Please login.');
        setAuthMode('login');
        setUserAuthForm({ ...userAuthForm, password: '' });
      } else {
        alert(`Registration failed: ${result.error}`);
      }
    } else {
      const { email, password } = userAuthForm;
      if (!email || !password) {
        alert('Please enter email and password');
        return;
      }

      setLoading(true);
      const result = await loginUser(email, password);
      setLoading(false);

      if (result.success) {
        setCurrentUser(result.user);
        setUserToken(result.token);
        setUserSession(result.token, result.expiresIn);
        setShowUserAuth(false);
        resetUserAuthForm();
      } else {
        alert(`Login failed: ${result.error}`);
      }
    }
  };

  const logoutUser = () => {
    setCurrentUser(null);
    setUserToken(null);
    clearUserSession();
  };

  const resetUserAuthForm = () => {
    setUserAuthForm({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      phone: ''
    });
  };

  // User session management
  const setUserSession = (token, expiresInSeconds) => {
    const expirationTime = Date.now() + (expiresInSeconds * 1000);
    localStorage.setItem('userSession', JSON.stringify({
      token: token,
      expiresAt: expirationTime
    }));
  };

  const getUserSession = () => {
    try {
      const session = localStorage.getItem('userSession');
      if (!session) return null;
      
      const { token, expiresAt } = JSON.parse(session);
      
      if (Date.now() > expiresAt) {
        clearUserSession();
        return null;
      }
      
      return { token, expiresAt };
    } catch (error) {
      console.error('Error reading user session:', error);
      clearUserSession();
      return null;
    }
  };

  const clearUserSession = () => {
    localStorage.removeItem('userSession');
  };

  // Search users for game creation
  const searchUsers = async (query = '') => {
    try {
      const response = await apiCall(`/users/search?q=${encodeURIComponent(query)}`);
      return response.users || [];
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  };

  const deleteGame = async (gameId) => {
    if (window.confirm('Are you sure you want to delete this game? This action cannot be undone.')) {
      try {
        setError('');
        await deleteGameFromDB(gameId);
        
        // Remove from games list
        setGames(games.filter(game => game.id !== gameId));
      } catch (dbError) {
        console.warn('Database delete failed:', dbError);
        setError('Failed to delete game from database.');
      }
    }
  };

  const saveGame = async () => {
    const gameToSave = editingGame || newGame;
    if (gameToSave.date && gameToSave.results.every(r => r.player)) {
      try {
        setError('');
        
        if (editingGame) {
          // Update existing game
          try {
            const updatedGameData = {
              date: editingGame.date,
              gameNumber: editingGame.gameNumber,
              results: editingGame.results
            };
            await updateGameInDB(editingGame.id, updatedGameData);
            
            // Update games list
            setGames(games.map(game => 
              game.id === editingGame.id ? { ...editingGame } : game
            ));
          } catch (dbError) {
            console.warn('Database update failed:', dbError);
            setError('Failed to update game in database.');
            return;
          }
        } else {
          // Create new game
          const gameData = {
            ...newGame,
            createdAt: new Date().toISOString()
          };

          try {
            const savedGame = await saveGameToDB(gameData);
            setGames([...games, { ...gameData, id: savedGame.id || games.length + 1 }]);
          } catch (dbError) {
            console.warn('Database save failed, adding locally:', dbError);
            setGames([...games, { ...gameData, id: games.length + 1 }]);
            setError('Game saved locally. Database sync failed.');
          }
        }

        // Reset form
        setNewGame({
          date: '',
          gameNumber: 1,
          results: [{ player: '', position: 1, winnings: 0, rebuys: 0, bestHandParticipant: false, bestHandWinner: false }]
        });
        setEditingGame(null);
        setShowAddGame(false);
      } catch (err) {
        setError('Failed to save game: ' + err.message);
      }
    } else {
      setError('Please fill in all required fields');
    }
  };

  // Helper component for sortable column headers
  const SortableHeader = ({ field, children, align = "text-left", sticky = false }) => {
    const getSortIcon = () => {
      if (sortField !== field) return <ChevronsUpDown className="w-4 h-4" />;
      return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
    };

    const stickyClasses = sticky 
      ? "sticky left-0 bg-white z-10 shadow-sm border-r border-gray-200" 
      : "";

    return (
      <th 
        className={`${align} py-2 px-4 cursor-pointer hover:bg-gray-100 select-none ${stickyClasses}`}
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center gap-1 justify-center">
          <span>{children}</span>
          {getSortIcon()}
        </div>
      </th>
    );
  };

  const standings = getSortedStandings();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-2">
            <Trophy className="text-yellow-500" />
            Dealin Holden
          </h1>
          <p className="text-gray-600">Track games, winnings, and season standings</p>
          
          {/* User/Admin Authentication */}
          <div className="flex justify-center items-center gap-4 mt-4">
            {currentUser ? (
              <div className="flex items-center gap-2 bg-blue-100 px-3 py-1 rounded-full">
                <span className="text-blue-700 text-sm font-medium">
                  {currentUser.firstName ? `${currentUser.firstName} ${currentUser.lastName}` : 'User'}
                </span>
                <button
                  onClick={logoutUser}
                  className="text-blue-600 hover:text-blue-800 text-sm underline"
                >
                  Logout
                </button>
              </div>
            ) : isAdmin ? (
              <div className="flex items-center gap-2 bg-green-100 px-3 py-1 rounded-full">
                <span className="text-green-600 text-sm font-medium">Admin Mode</span>
                <button
                  onClick={handleAdminLogout}
                  className="text-green-600 hover:text-green-800 text-sm underline"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowUserAuth(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                  Login / Register
                </button>
                <button
                  onClick={() => setShowAdminLogin(true)}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                  Admin
                </button>
              </div>
            )}
          </div>
          
          {/* Status indicators */}
          <div className="flex justify-center items-center gap-4 mt-4">
            <button
              onClick={loadGames}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {API_BASE_URL ? 'Refresh' : 'Reset Demo'}
            </button>
            
            {!API_BASE_URL && (
              <div className="bg-blue-100 border border-blue-400 text-blue-700 px-3 py-2 rounded text-sm">
                🧪 Demo Mode - Configure REACT_APP_API_URL to connect to backend
              </div>
            )}
            
            {error && (
              <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-3 py-2 rounded text-sm">
                {error}
              </div>
            )}
            
            {loading && (
              <div className="text-blue-600 text-sm flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                Loading...
              </div>
            )}
          </div>
        </header>

        {/* Season Standings */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="text-blue-500" />
            Season Standings
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-2 px-4">Rank</th>
                  <SortableHeader field="player" align="text-left" sticky={true}>Player</SortableHeader>
                  <SortableHeader field="points" align="text-center">Points</SortableHeader>
                  <SortableHeader field="games" align="text-center">Games</SortableHeader>
                  <SortableHeader field="winRate" align="text-center">Win Rate</SortableHeader>
                  <SortableHeader field="avgFinishPosition" align="text-center">Avg Pos</SortableHeader>
                  <SortableHeader field="currentStreak" align="text-center">Streak</SortableHeader>
                  <SortableHeader field="bestHandWinCount" align="text-center">Best Hand Wins</SortableHeader>
                  <SortableHeader field="winnings" align="text-center">Total Winnings</SortableHeader>
                  <SortableHeader field="netWinnings" align="text-center">Net P/L</SortableHeader>
                </tr>
              </thead>
              <tbody>
                {standings.map((player, index) => (
                  <tr key={player.player} className={`border-b ${player.rank === 1 ? 'bg-yellow-50' : ''}`}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {player.rank === 1 && <Trophy className="w-4 h-4 text-yellow-500" />}
                        #{player.rank}
                      </div>
                    </td>
                    <td className={`py-3 px-4 font-semibold sticky left-0 z-10 shadow-sm border-r border-gray-200 ${player.rank === 1 ? 'bg-yellow-50' : 'bg-white'}`}>
                      {player.player}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-blue-600">{player.points.toFixed(1)}</td>
                    <td className="py-3 px-4 text-center">{player.games}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`${player.winRate >= 20 ? 'text-green-600 font-semibold' : player.winRate >= 10 ? 'text-yellow-600' : 'text-gray-600'}`}>
                        {player.winRate.toFixed(1)}%
                      </span>
                      <div className="text-xs text-gray-500">
                        {player.wins}-{player.games - player.wins}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`${player.avgFinishPosition <= 2 ? 'text-green-600 font-semibold' : player.avgFinishPosition <= 3 ? 'text-yellow-600' : 'text-gray-600'}`}>
                        {player.avgFinishPosition.toFixed(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {player.currentStreak > 0 ? (
                        <span className={`font-semibold ${player.streakType === 'win' ? 'text-green-600' : 'text-red-600'}`}>
                          {player.streakType === 'win' ? 'W' : 'L'}{player.currentStreak}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-blue-600 font-semibold text-lg">
                        {player.bestHandWinCount || 0}
                      </span>
                      {player.bestHandParticipationCount > 0 && (
                        <div className="text-xs text-gray-500">
                          Participated: {player.bestHandParticipationCount} times
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center text-green-600 font-semibold">
                      ${player.winnings.toFixed(0)}
                    </td>
                    <td className={`py-3 px-4 text-center font-semibold ${
                      player.netWinnings >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {player.netWinnings >= 0 ? '+' : ''}${player.netWinnings}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Game Button */}
        <div className="text-center mb-6">
          <button
            onClick={() => {
              setEditingGame(null);
              setShowAddGame(!showAddGame);
            }}
            className={`px-6 py-3 rounded-lg flex items-center gap-2 mx-auto ${
              isAdmin 
                ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                : 'bg-gray-400 text-gray-200 cursor-not-allowed'
            }`}
            disabled={loading || !isAdmin}
            title={!isAdmin ? 'Admin login required' : ''}
          >
            <Plus className="w-5 h-5" />
            Add New Game
          </button>
        </div>

        {/* Add/Edit Game Form */}
        {showAddGame && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Save className="w-5 h-5" />
                {editingGame ? 'Edit Game' : 'Add New Game'}
              </h3>
              {editingGame && (
                <button
                  onClick={cancelEdit}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Date *</label>
                <input
                  type="date"
                  value={editingGame ? editingGame.date : newGame.date}
                  onChange={(e) => {
                    if (editingGame) {
                      setEditingGame({ ...editingGame, date: e.target.value });
                    } else {
                      setNewGame({ ...newGame, date: e.target.value });
                    }
                  }}
                  className="w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Game Number *</label>
                <input
                  type="number"
                  min="1"
                  value={editingGame ? editingGame.gameNumber : newGame.gameNumber}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    if (editingGame) {
                      setEditingGame({ ...editingGame, gameNumber: value });
                    } else {
                      setNewGame({ ...newGame, gameNumber: value });
                    }
                  }}
                  className="w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>
            </div>

            <h4 className="font-semibold mb-3">Players & Results</h4>
            {(editingGame ? editingGame.results : newGame.results).map((result, index) => (
              <div key={index} className="grid grid-cols-1 lg:grid-cols-7 gap-2 mb-3 p-3 bg-gray-50 rounded">
                <div>
                  <label className="block text-xs font-medium mb-1">Player *</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={result.player}
                      onChange={async (e) => {
                        updatePlayerResult(index, 'player', e.target.value);
                        // Search users when typing (if authenticated)
                        if ((currentUser || isAdmin) && e.target.value.length > 1) {
                          const users = await searchUsers(e.target.value);
                          setAvailableUsers(users);
                        } else {
                          setAvailableUsers([]);
                        }
                      }}
                      className="w-full border rounded px-2 py-1 text-sm"
                      placeholder={(currentUser || isAdmin) ? "Type name or select user" : "Player name"}
                      required
                    />
                    {/* User suggestions dropdown */}
                    {availableUsers.length > 0 && result.player.length > 1 && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-b max-h-32 overflow-y-auto z-10">
                        {availableUsers.map((user) => (
                          <button
                            key={user.userId}
                            type="button"
                            onClick={() => {
                              updatePlayerResult(index, 'player', user.displayName);
                              setAvailableUsers([]);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm border-b border-gray-100 last:border-b-0"
                          >
                            <div className="font-medium">{user.displayName}</div>
                            {user.email && <div className="text-xs text-gray-500">{user.email}</div>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Position</label>
                  <input
                    type="number"
                    min="1"
                    value={result.position}
                    onChange={(e) => updatePlayerResult(index, 'position', e.target.value)}
                    className="w-full border rounded px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Winnings ($)</label>
                  <input
                    type="number"
                    min="0"
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
                  <label className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={result.bestHandParticipant || false}
                      onChange={(e) => updatePlayerResult(index, 'bestHandParticipant', e.target.checked)}
                      className="mr-1"
                    />
                    Participated
                  </label>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Best Hand</label>
                  <label className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={result.bestHandWinner || false}
                      onChange={(e) => updatePlayerResult(index, 'bestHandWinner', e.target.checked)}
                      className="mr-1"
                    />
                    Won
                  </label>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Action</label>
                  <button
                    onClick={() => removePlayer(index)}
                    className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs"
                    disabled={(editingGame ? editingGame.results : newGame.results).length <= 1}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

            <div className="flex gap-4 mt-4">
              <button
                onClick={addPlayerToGame}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
              >
                Add Player
              </button>
              <button
                onClick={saveGame}
                disabled={loading}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded flex items-center gap-2"
              >
                {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                {editingGame ? 'Update Game' : 'Save Game'}
              </button>
              <button
                onClick={editingGame ? cancelEdit : () => setShowAddGame(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Game History */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Calendar className="text-purple-500" />
            Game History ({games.length} games)
          </h2>
          
          {games.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No games recorded yet. Add your first game above!
            </div>
          ) : (
            games
              .sort((a, b) => new Date(b.date) - new Date(a.date) || b.gameNumber - a.gameNumber)
              .map(game => (
                <div key={game.id} className="border-b pb-4 mb-4 last:border-b-0">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4">
                      <h3 className="text-lg font-semibold">
                        {new Date(game.date + 'T00:00:00').toLocaleDateString()} - Game {game.gameNumber}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="w-4 h-4" />
                        {game.results.length} players
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => (isAdmin || currentUser) && startEditingGame(game)}
                        className={`p-2 rounded-lg ${
                          (isAdmin || currentUser) 
                            ? 'text-blue-600 hover:text-blue-800 hover:bg-blue-50' 
                            : 'text-gray-400 cursor-not-allowed'
                        }`}
                        disabled={!isAdmin && !currentUser}
                        title={(isAdmin || currentUser) ? "Edit game" : "Please login to edit games"}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => (isAdmin || currentUser) && deleteGame(game.id)}
                        className={`p-2 rounded-lg ${
                          (isAdmin || currentUser) 
                            ? 'text-red-600 hover:text-red-800 hover:bg-red-50' 
                            : 'text-gray-400 cursor-not-allowed'
                        }`}
                        disabled={!isAdmin && !currentUser}
                        title={(isAdmin || currentUser) ? "Delete game" : "Please login to delete games"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {game.results
                      .sort((a, b) => a.position - b.position)
                      .map((result, index) => (
                        <div key={index} className={`p-3 rounded ${
                          result.position === 1 ? 'bg-yellow-100 border-yellow-300' :
                          result.position === 2 ? 'bg-gray-100 border-gray-300' :
                          result.position === 3 ? 'bg-orange-100 border-orange-300' :
                          'bg-white border-gray-200'
                        } border`}>
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-semibold">
                                {result.position === 1 && '🏆 '}
                                {result.position}. {result.player}
                                {result.tied && ' (tie)'}
                              </div>
                              <div className="text-sm text-gray-600 flex items-center gap-2">
                                <DollarSign className="w-3 h-3" />
                                ${result.winnings}
                                {result.rebuys > 0 && ` (${result.rebuys} rebuys)`}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-gray-500">Points</div>
                              <div className="font-bold text-blue-600">
                                {calculatePoints(game.results, result).toFixed(1)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      {/* Admin Login Modal */}
      {showAdminLogin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Admin Login</h3>
            <input
              type="password"
              placeholder="Enter admin password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowAdminLogin(false);
                  setAdminPassword('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleAdminLogin}
                disabled={loading || !adminPassword.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
              >
                {loading ? 'Verifying...' : 'Login'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Authentication Modal */}
      {showUserAuth && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {authMode === 'login' ? 'Login' : 'Register'}
              </h3>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setAuthMode('login')}
                  className={`px-3 py-1 text-sm rounded ${
                    authMode === 'login' 
                      ? 'bg-white shadow text-blue-600' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Login
                </button>
                <button
                  onClick={() => setAuthMode('register')}
                  className={`px-3 py-1 text-sm rounded ${
                    authMode === 'register' 
                      ? 'bg-white shadow text-blue-600' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Register
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {authMode === 'register' && (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="First Name *"
                    value={userAuthForm.firstName}
                    onChange={(e) => setUserAuthForm({ ...userAuthForm, firstName: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  />
                  <input
                    type="text"
                    placeholder="Last Name *"
                    value={userAuthForm.lastName}
                    onChange={(e) => setUserAuthForm({ ...userAuthForm, lastName: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  />
                </div>
              )}
              
              <input
                type="email"
                placeholder="Email Address *"
                value={userAuthForm.email}
                onChange={(e) => setUserAuthForm({ ...userAuthForm, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
              
              <input
                type="password"
                placeholder="Password *"
                value={userAuthForm.password}
                onChange={(e) => setUserAuthForm({ ...userAuthForm, password: e.target.value })}
                onKeyPress={(e) => e.key === 'Enter' && handleUserAuth()}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
              
              {authMode === 'register' && (
                <input
                  type="tel"
                  placeholder="Phone Number (optional)"
                  value={userAuthForm.phone}
                  onChange={(e) => setUserAuthForm({ ...userAuthForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
              )}
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <button
                onClick={() => {
                  setShowUserAuth(false);
                  resetUserAuthForm();
                  setAuthMode('login');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleUserAuth}
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
              >
                {loading ? 'Processing...' : (authMode === 'login' ? 'Login' : 'Register')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DealinHolden;