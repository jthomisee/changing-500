import { useState, useEffect, useCallback, useMemo } from 'react';
import { loadUserGames } from '../services/gameService';
import { calculateSideBetWinnings } from '../utils/gameUtils';
import { apiCall } from '../services/api';

/**
 * Hook to efficiently load games for a specific user using the new /users/games endpoint
 * This uses DynamoDB queries instead of expensive scans
 */
export const useAllUserGames = (groups = [], currentUser) => {
  const [allGames, setAllGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [groupSideBetsMap, setGroupSideBetsMap] = useState({});

  const loadGroupSideBets = useCallback(async () => {
    if (!groups.length) {
      setGroupSideBetsMap({});
      return;
    }

    try {
      const sideBetsPromises = groups.map(async (group) => {
        try {
          const data = await apiCall(`/groups/${group.groupId}/side-bets`, {
            method: 'GET',
          });
          return { groupId: group.groupId, sideBets: data.sideBets || [] };
        } catch (error) {
          console.error(
            `Failed to fetch side bets for group ${group.groupId}:`,
            error
          );
          return { groupId: group.groupId, sideBets: [] };
        }
      });

      const results = await Promise.all(sideBetsPromises);
      const sideBetsMap = results.reduce((map, result) => {
        map[result.groupId] = result.sideBets;
        return map;
      }, {});

      setGroupSideBetsMap(sideBetsMap);
    } catch (error) {
      console.error('Failed to load group side bets:', error);
      setGroupSideBetsMap({});
    }
  }, [groups]);

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
      console.log(
        `[useAllUserGames] Loaded ${userGames.length} games from API for user ${currentUser.userId}`
      );
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

  // Add group names and calculate P&L with side bet winnings
  const userGamesWithGroups = useMemo(() => {
    if (!allGames.length || !currentUser?.userId) {
      console.log(
        '[useAllUserGames] Memo early return - allGames.length:',
        allGames.length,
        'currentUser:',
        currentUser?.userId
      );
      return [];
    }

    // Wait for groups to load before processing games
    if (!groups.length) {
      console.log('[useAllUserGames] Memo waiting for groups to load');
      return [];
    }

    console.log(
      `[useAllUserGames] Processing ${allGames.length} games with ${groups.length} groups`
    );

    const processedGames = allGames.map((game) => {
      const group = groups.find((g) => g.groupId === game.groupId);
      const userResult = game.results?.find(
        (result) => result.userId === currentUser.userId
      );

      if (!userResult) {
        console.warn(
          `[useAllUserGames] User ${currentUser.userId} NOT found in game ${game.id} (${game.date})`,
          '\nGame results userIds:',
          game.results?.map((r) => r.userId)
        );
        return {
          ...game,
          groupName: group?.name || 'Unknown Group',
          _missingUserResult: true, // Debug flag
        };
      }

      // Calculate side bet winnings for this user
      const groupSideBets = groupSideBetsMap[game.groupId] || [];
      const sideBetWinnings = calculateSideBetWinnings(
        userResult,
        game.results,
        groupSideBets
      );

      // Calculate total cost and profit including side bet winnings
      const actualWinnings = userResult.winnings || 0;
      const totalCost =
        (game.buyin || 20) + (userResult.rebuys || 0) * (game.buyin || 20);
      const userProfitLoss = actualWinnings - totalCost + sideBetWinnings;

      return {
        ...game,
        groupName: group?.name || 'Unknown Group',
        // Properties expected by GameHistoryTable
        userResult, // Pass full userResult object for stats calculations
        userPosition: userResult.position || 999,
        userWinnings: actualWinnings, // Winnings should only be the prize money, not including side bets
        userSideBetWinnings: sideBetWinnings,
        userRebuys: userResult.rebuys || 0,
        userProfitLoss, // This includes side bet winnings in P&L calculation
        userTotalCost: totalCost,
        userBestHandParticipant: userResult.bestHandParticipant || false,
        userBestHandWinner: userResult.bestHandWinner || false,
        buyin: game.buyin || 20,
      };
    });

    console.log(
      `[useAllUserGames] Processed games: ${processedGames.length} total, ${processedGames.filter((g) => g._missingUserResult).length} missing userResult`
    );

    return processedGames;
  }, [allGames, groups, groupSideBetsMap, currentUser?.userId]);

  // Load games when groups or user changes
  useEffect(() => {
    loadAllUserGames();
  }, [loadAllUserGames]);

  // Load side bets when groups change
  useEffect(() => {
    loadGroupSideBets();
  }, [loadGroupSideBets]);

  return {
    allGames: userGamesWithGroups,
    loading,
    error,
    refetch: loadAllUserGames,
  };
};
