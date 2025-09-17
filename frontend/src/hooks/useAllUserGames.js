import { useState, useEffect, useCallback, useMemo } from 'react';
import { loadUserGames } from '../services/gameService';

/**
 * Hook to efficiently load games for a specific user using the new /users/games endpoint
 * This uses DynamoDB queries instead of expensive scans
 */
export const useAllUserGames = (groups = [], currentUser) => {
  const [allGames, setAllGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadAllUserGames = useCallback(async () => {
    if (!currentUser?.userId) {
      setAllGames([]);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Use the new efficient endpoint that queries by user's groups
      const userGames = await loadUserGames(currentUser.userId);
      setAllGames(userGames);
      setError('');
    } catch (err) {
      console.error('Failed to load user games:', err);
      setError('Failed to load game history');
      setAllGames([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.userId]);

  // Add group names to games when groups are available
  const userGamesWithGroups = useMemo(() => {
    if (!allGames.length || !groups.length) {
      return allGames;
    }

    return allGames.map((game) => {
      const group = groups.find((g) => g.groupId === game.groupId);
      return {
        ...game,
        groupName: group?.name || 'Unknown Group',
      };
    });
  }, [allGames, groups]);

  // Load games when groups or user changes
  useEffect(() => {
    loadAllUserGames();
  }, [loadAllUserGames]);

  return {
    allGames: userGamesWithGroups,
    loading,
    error,
    refetch: loadAllUserGames,
  };
};
