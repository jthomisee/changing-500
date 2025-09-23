import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { sortGameResultsByPosition } from '../utils/gameUtils.js';

const initialResult = {
  userId: '',
  position: 1,
  winnings: 0,
  rebuys: 0,
  sideBets: [], // Array of side bet participation/win data
  rsvpStatus: 'pending',

  // Cash game specific fields
  buyInAmount: 0, // How much they bought in for (cash games)
  cashOutAmount: 0, // How much they left with (cash games)
};

const initialGameState = {
  date: '',
  time: '',
  status: 'completed', // 'scheduled' or 'completed'
  results: [initialResult],
  selectedSideBets: [], // Array of side bet IDs selected for this game

  // Game type and configuration
  gameType: 'tournament', // 'cash' or 'tournament'
  buyin: 20, // Default buy-in amount

  // House take configuration
  houseTake: 0, // Amount or percentage taken by house
  houseTakeType: 'fixed', // 'fixed' (dollar amount) or 'percentage'

  // Tournament payout structure (for tournament games)
  payoutStructure: [
    { position: 1, type: 'percentage', value: 70 }, // 1st place gets 70%
    { position: 2, type: 'buyin_return', value: 1 }, // 2nd place gets buyin back
    // Remaining goes to house/missing players
  ],

  // Cash game settings
  maxBuyIn: 200, // Maximum buy-in for cash games
  minBuyIn: 20, // Minimum buy-in for cash games
};

export const useGameForm = () => {
  const { currentUser } = useAuth();
  const [showAddGame, setShowAddGame] = useState(false);
  const [editingGame, setEditingGame] = useState(null);
  const [newGame, setNewGame] = useState(initialGameState);

  // Open add game form
  const openAddGame = () => {
    setNewGame(initialGameState);
    setEditingGame(null);
    setShowAddGame(true);
  };

  // Helper function to convert UTC datetime from database to user timezone for editing
  const convertFromUTCForEditing = (utcDate, utcTime) => {
    if (!utcDate) return { date: '', time: '' };

    if (utcTime) {
      try {
        // Get user's timezone preference, default to America/New_York
        const userTimezone = currentUser?.timezone || 'America/New_York';

        // Create a UTC date object
        const utcDateTime = new Date(`${utcDate}T${utcTime}:00.000Z`);

        // Convert to user's timezone
        const userDate = utcDateTime.toLocaleDateString('en-CA', {
          timeZone: userTimezone,
        }); // YYYY-MM-DD format
        const userTime = utcDateTime.toLocaleTimeString('en-GB', {
          timeZone: userTimezone,
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
        }); // HH:MM format

        return { date: userDate, time: userTime };
      } catch (error) {
        console.error(
          'Error converting UTC to user timezone for editing:',
          error
        );
        // Fallback to local timezone
        const utcDateTime = new Date(`${utcDate}T${utcTime}:00.000Z`);
        const localDate = utcDateTime.toLocaleDateString('en-CA');
        const localTime = utcDateTime.toLocaleTimeString('en-GB', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
        });
        return { date: localDate, time: localTime };
      }
    }

    return { date: utcDate, time: '' };
  };

  // Open edit game form
  const startEditingGame = (game) => {
    // Convert UTC time back to local time for editing
    const { date: localDate, time: localTime } = convertFromUTCForEditing(
      game.date,
      game.time
    );

    // Sort results by position for better editing experience
    const sortedResults = game.results
      ? sortGameResultsByPosition(game.results)
      : [];

    const gameWithLocalTime = {
      ...game,
      date: localDate,
      time: localTime,
      results: sortedResults,
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
    setNewGame((prev) => ({ ...prev, [field]: value }));
  };

  // Add a new player result
  const addPlayerToGame = () => {
    const nextPosition =
      Math.max(...(newGame.results.map((r) => r.position) || [0])) + 1;
    const newPlayerResult = {
      ...initialResult,
      position: nextPosition,
      sideBets: [], // Will be populated by the UI based on selected side bets
    };

    setNewGame((prev) => ({
      ...prev,
      results: [...prev.results, newPlayerResult],
    }));
  };

  // Remove a player result
  const removePlayerFromGame = (index) => {
    if (newGame.results.length > 1) {
      setNewGame((prev) => ({
        ...prev,
        results: prev.results.filter((_, i) => i !== index),
      }));
    }
  };

  // Update a specific player result field
  const updatePlayerResult = (index, field, value) => {
    setNewGame((prev) => ({
      ...prev,
      results: prev.results.map((result, i) => {
        if (i === index) {
          // Handle different field types
          if (
            field === 'winnings' ||
            field === 'position' ||
            field === 'rebuys'
          ) {
            return { ...result, [field]: Number(value) || 0 };
          } else if (
            field === 'bestHandParticipant' ||
            field === 'bestHandWinner'
          ) {
            return { ...result, [field]: Boolean(value) };
          } else {
            return { ...result, [field]: value };
          }
        }
        return result;
      }),
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
    isEditing: !!editingGame,
  };
};
