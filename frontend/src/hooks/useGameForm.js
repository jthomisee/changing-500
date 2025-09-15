import { useState } from 'react';

const initialResult = { 
  userId: '',
  position: 1, 
  winnings: 0, 
  rebuys: 0, 
  bestHandParticipant: false, 
  bestHandWinner: false,
  rsvpStatus: 'pending'
};

const initialGameState = {
  date: '',
  time: '',
  gameNumber: 1,
  results: [initialResult]
};

export const useGameForm = () => {
  const [showAddGame, setShowAddGame] = useState(false);
  const [editingGame, setEditingGame] = useState(null);
  const [newGame, setNewGame] = useState(initialGameState);

  // Open add game form
  const openAddGame = () => {
    setNewGame(initialGameState);
    setEditingGame(null);
    setShowAddGame(true);
  };

  // Helper function to convert UTC datetime from database to local time for editing
  const convertFromUTCForEditing = (utcDate, utcTime) => {
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

  // Open edit game form
  const startEditingGame = (game) => {
    // Convert UTC time back to local time for editing
    const { date: localDate, time: localTime } = convertFromUTCForEditing(game.date, game.time);
    
    const gameWithLocalTime = {
      ...game,
      date: localDate,
      time: localTime
    };
    
    setEditingGame(game); // Keep original game data
    setNewGame(gameWithLocalTime); // Use local time for form
    setShowAddGame(true);
  };

  // Close form
  const closeForm = () => {
    setShowAddGame(false);
    setEditingGame(null);
    setNewGame(initialGameState);
  };

  // Update game data
  const updateGameData = (field, value) => {
    setNewGame(prev => ({ ...prev, [field]: value }));
  };

  // Add a new player result
  const addPlayerToGame = () => {
    const nextPosition = Math.max(...(newGame.results.map(r => r.position) || [0])) + 1;
    setNewGame(prev => ({
      ...prev,
      results: [...prev.results, { ...initialResult, position: nextPosition }]
    }));
  };

  // Remove a player result
  const removePlayerFromGame = (index) => {
    if (newGame.results.length > 1) {
      setNewGame(prev => ({
        ...prev,
        results: prev.results.filter((_, i) => i !== index)
      }));
    }
  };

  // Update a specific player result field
  const updatePlayerResult = (index, field, value) => {
    setNewGame(prev => ({
      ...prev,
      results: prev.results.map((result, i) => {
        if (i === index) {
          // Handle different field types
          if (field === 'winnings' || field === 'position' || field === 'rebuys') {
            return { ...result, [field]: Number(value) || 0 };
          } else if (field === 'bestHandParticipant' || field === 'bestHandWinner') {
            return { ...result, [field]: Boolean(value) };
          } else {
            return { ...result, [field]: value };
          }
        }
        return result;
      })
    }));
  };

  // Get the current game data being edited
  const getCurrentGameData = () => {
    return editingGame ? editingGame : newGame;
  };

  return {
    // State
    showAddGame,
    editingGame,
    newGame,
    
    // Actions
    openAddGame,
    startEditingGame,
    closeForm,
    updateGameData,
    addPlayerToGame,
    removePlayerFromGame,
    updatePlayerResult,
    getCurrentGameData,
    
    // Helpers
    isEditing: !!editingGame
  };
};
