import { useState, useCallback } from 'react';
import { loadGames, saveGameToDB, updateGameInDB, deleteGameFromDB } from '../services/gameService';
import { validateGameData } from '../utils/gameUtils';

export const useGames = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load all games from API
  const loadAllGames = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const loadedGames = await loadGames();
      setGames(loadedGames);
    } catch (err) {
      console.error('Failed to load games:', err);
      setError('Failed to load games. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Save a new game
  const saveGame = async (gameData) => {
    const validationErrors = validateGameData(gameData);
    if (validationErrors.length > 0) {
      throw new Error(validationErrors[0]);
    }

    setLoading(true);
    setError('');
    
    try {
      const gameToSave = {
        ...gameData,
        createdAt: new Date().toISOString()
      };

      const savedGame = await saveGameToDB(gameToSave);
      const newGame = { ...gameToSave, id: savedGame.id || games.length + 1 };
      setGames([...games, newGame]);
      return newGame;
    } catch (dbError) {
      console.warn('Database save failed, adding locally:', dbError);
      const localGame = { ...gameData, id: games.length + 1 };
      setGames([...games, localGame]);
      setError('Game saved locally. Database sync failed.');
      return localGame;
    } finally {
      setLoading(false);
    }
  };

  // Update an existing game
  const updateGame = async (gameId, gameData) => {
    const validationErrors = validateGameData(gameData);
    if (validationErrors.length > 0) {
      throw new Error(validationErrors[0]);
    }

    setLoading(true);
    setError('');

    try {
      await updateGameInDB(gameId, gameData);
      
      setGames(games.map(game => 
        game.id === gameId ? { ...gameData, id: gameId } : game
      ));
    } catch (dbError) {
      console.warn('Database update failed:', dbError);
      setError('Failed to update game in database.');
    } finally {
      setLoading(false);
    }
  };

  // Delete a game
  const deleteGame = async (gameId) => {
    if (!window.confirm('Are you sure you want to delete this game? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      await deleteGameFromDB(gameId);
      setGames(games.filter(game => game.id !== gameId));
    } catch (err) {
      console.error('Failed to delete game:', err);
      setError('Failed to delete game. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return {
    games,
    loading,
    error,
    setError,
    loadAllGames,
    saveGame,
    updateGame,
    deleteGame
  };
};
