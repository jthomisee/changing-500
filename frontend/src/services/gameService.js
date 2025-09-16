import { apiCall } from './api';

// Game API calls
export const loadGames = async () => {
  try {
    const response = await apiCall('/games');
    return response.games || [];
  } catch (error) {
    console.error('Failed to load games:', error);
    throw error;
  }
};

export const loadScheduledGames = async () => {
  try {
    const response = await apiCall('/games?status=scheduled');
    return response.games || [];
  } catch (error) {
    console.error('Failed to load scheduled games:', error);
    throw error;
  }
};

export const saveGameToDB = async (gameData) => {
  try {
    return await apiCall('/games', {
      method: 'POST',
      body: JSON.stringify(gameData)
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
      body: JSON.stringify(gameData)
    });
  } catch (error) {
    console.error('Failed to update game:', error);
    throw error;
  }
};

export const deleteGameFromDB = async (gameId) => {
  try {
    return await apiCall(`/games/${gameId}`, {
      method: 'DELETE'
    });
  } catch (error) {
    console.error('Failed to delete game:', error);
    throw error;
  }
};
