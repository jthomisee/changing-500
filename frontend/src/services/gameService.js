import { apiCall } from './api';

// Game API calls
export const loadGames = async (
  limit = 10,
  lastEvaluatedKey = null,
  groupId = null
) => {
  try {
    let queryParams = `?limit=${limit}`;
    if (lastEvaluatedKey) {
      queryParams += `&lastEvaluatedKey=${encodeURIComponent(lastEvaluatedKey)}`;
    }
    if (groupId) {
      queryParams += `&groupId=${groupId}`;
    }

    const response = await apiCall(`/games${queryParams}`);
    return {
      games: response.games || [],
      count: response.count || 0,
      hasMore: response.hasMore || false,
      lastEvaluatedKey: response.lastEvaluatedKey,
    };
  } catch (error) {
    console.error('Failed to load games:', error);
    throw error;
  }
};

export const loadScheduledGames = async (
  limit = 10,
  lastEvaluatedKey = null
) => {
  try {
    let queryParams = `?status=scheduled&limit=${limit}`;
    if (lastEvaluatedKey) {
      queryParams += `&lastEvaluatedKey=${encodeURIComponent(lastEvaluatedKey)}`;
    }

    const response = await apiCall(`/games${queryParams}`);
    return {
      games: response.games || [],
      count: response.count || 0,
      hasMore: response.hasMore || false,
      lastEvaluatedKey: response.lastEvaluatedKey,
    };
  } catch (error) {
    console.error('Failed to load scheduled games:', error);
    throw error;
  }
};

export const saveGameToDB = async (gameData) => {
  try {
    return await apiCall('/games', {
      method: 'POST',
      body: JSON.stringify(gameData),
    });
  } catch (error) {
    console.error('Failed to save game:', error);
    throw error;
  }
};

export const updateGameInDB = async (gameId, gameData) => {
  try {
    return await apiCall(`/games/${gameId}`, {
      method: 'PUT',
      body: JSON.stringify(gameData),
    });
  } catch (error) {
    console.error('Failed to update game:', error);
    throw error;
  }
};

export const deleteGameFromDB = async (gameId) => {
  try {
    return await apiCall(`/games/${gameId}`, {
      method: 'DELETE',
    });
  } catch (error) {
    console.error('Failed to delete game:', error);
    throw error;
  }
};

export const loadUserGames = async (userId) => {
  try {
    const response = await apiCall(`/users/games?userId=${userId}`);
    return response.games || [];
  } catch (error) {
    console.error('Failed to load user games:', error);
    throw error;
  }
};
