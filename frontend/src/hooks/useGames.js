import { useState, useCallback, useEffect } from 'react';
import {
  loadGames,
  saveGameToDB,
  updateGameInDB,
  deleteGameFromDB,
} from '../services/gameService';
import { validateGameData } from '../utils/gameUtils';
import { useAuth } from '../context/AuthContext.jsx';

export const useGames = () => {
  const { isAuthenticated, currentUser } = useAuth();
  const [games, setGames] = useState([]);
  const [scheduledGames, setScheduledGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasMoreGames, setHasMoreGames] = useState(false);
  const [hasMoreScheduled, setHasMoreScheduled] = useState(false);
  const [gamesLastKey, setGamesLastKey] = useState(null);
  const [scheduledLastKey, setScheduledLastKey] = useState(null);

  // Load all games from API (backward compatibility - loads all at once)
  const loadAllGames = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Load with high limit to get all games for backward compatibility
      const result = await loadGames(1000);
      setGames(result.games);
      setHasMoreGames(result.hasMore);
      setGamesLastKey(result.lastEvaluatedKey);

      // Filter scheduled games client-side instead of making separate API call
      const scheduledGames = result.games.filter(
        (game) => game.status && game.status.toLowerCase() === 'scheduled'
      );
      setScheduledGames(scheduledGames);
    } catch (err) {
      console.error('Failed to load games:', err);
      setError('Failed to load games. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load games with pagination (for history pages)
  const loadGamesPaginated = useCallback(
    async (limit = 10, append = false, groupId = null) => {
      setLoading(true);
      setError('');
      try {
        const result = await loadGames(
          limit,
          append ? gamesLastKey : null,
          groupId
        );
        if (append) {
          setGames((prev) => [...prev, ...result.games]);
        } else {
          setGames(result.games);
        }
        setHasMoreGames(result.hasMore);
        setGamesLastKey(result.lastEvaluatedKey);
      } catch (err) {
        console.error('Failed to load games:', err);
        setError('Failed to load games. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [gamesLastKey]
  );

  // Load more games for pagination
  const loadMoreGames = useCallback(async () => {
    if (hasMoreGames && !loading) {
      await loadGamesPaginated(20, true);
    }
  }, [hasMoreGames, loading, loadGamesPaginated]);

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
        createdAt: new Date().toISOString(),
      };

      const savedGame = await saveGameToDB(gameToSave);
      const newGame = { ...gameToSave, id: savedGame.id || games.length + 1 };
      setGames((prev) => [...prev, newGame]);
      if ((newGame.status || '').toLowerCase() === 'scheduled') {
        setScheduledGames((prev) => [...prev, newGame]);
      }
      return newGame;
    } catch (dbError) {
      console.warn('Database save failed, adding locally:', dbError);
      const localGame = { ...gameData, id: games.length + 1 };
      setGames((prev) => [...prev, localGame]);
      if ((localGame.status || '').toLowerCase() === 'scheduled') {
        setScheduledGames((prev) => [...prev, localGame]);
      }
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
      const response = await updateGameInDB(gameId, gameData);
      const updatedGame =
        response && response.game ? response.game : { ...gameData, id: gameId };

      setGames((prev) =>
        prev.map((game) => (game.id === gameId ? updatedGame : game))
      );
      setScheduledGames((prev) => {
        const without = prev.filter((g) => g.id !== gameId);
        if ((updatedGame.status || '').toLowerCase() === 'scheduled') {
          return [...without, updatedGame];
        }
        return without;
      });
    } catch (dbError) {
      console.warn('Database update failed:', dbError);
      setError('Failed to update game in database.');
    } finally {
      setLoading(false);
    }
  };

  // Delete a game
  const deleteGame = async (gameId) => {
    if (
      !window.confirm(
        'Are you sure you want to delete this game? This action cannot be undone.'
      )
    ) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      await deleteGameFromDB(gameId);
      setGames((prev) => prev.filter((game) => game.id !== gameId));
      setScheduledGames((prev) => prev.filter((game) => game.id !== gameId));
    } catch (err) {
      console.error('Failed to delete game:', err);
      setError('Failed to delete game. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-load games when authenticated
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      loadAllGames();
    } else {
      // Clear games when not authenticated
      setGames([]);
      setScheduledGames([]);
    }
  }, [isAuthenticated, currentUser, loadAllGames]);

  return {
    games,
    scheduledGames,
    loading,
    error,
    setError,
    loadAllGames,
    loadGamesPaginated,
    loadMoreGames,
    hasMoreGames,
    hasMoreScheduled,
    saveGame,
    updateGame,
    deleteGame,
  };
};
