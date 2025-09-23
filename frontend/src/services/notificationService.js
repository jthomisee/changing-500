import { apiCall } from './api';

// Notification service functions
export const triggerGameInvitations = async (gameId) => {
  try {
    const data = await apiCall('/notifications/queue', {
      method: 'POST',
      body: JSON.stringify({
        gameId,
        notificationType: 'gameInvitations',
      }),
    });

    return { success: true, data };
  } catch (error) {
    console.error('Failed to trigger game invitations:', error);
    return { success: false, error: error.message };
  }
};

export const triggerGameResults = async (gameId) => {
  try {
    const data = await apiCall('/notifications/queue', {
      method: 'POST',
      body: JSON.stringify({
        gameId,
        notificationType: 'gameResults',
      }),
    });

    return { success: true, data };
  } catch (error) {
    console.error('Failed to trigger game results notifications:', error);
    return { success: false, error: error.message };
  }
};

export const getRSVPLink = (gameId, userId) => {
  // Generate RSVP link for web-based responses
  const baseUrl = window.location.origin;
  return `${baseUrl}/rsvp/${gameId}/${userId}`;
};

export const updateRSVPStatus = async (gameId, rsvpStatus) => {
  try {
    const data = await apiCall(`/games/${gameId}/rsvp`, {
      method: 'PUT',
      body: JSON.stringify({ rsvpStatus }),
    });

    return { success: true, data };
  } catch (error) {
    console.error('Failed to update RSVP status:', error);
    return { success: false, error: error.message };
  }
};
