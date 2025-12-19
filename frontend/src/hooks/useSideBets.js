import { useState, useEffect, useCallback } from 'react';
import { sideBetService } from '../services/sideBetService';

/**
 * Custom hook for managing group side bets
 * @param {string} groupId - The group ID
 * @returns {Object} Side bet management state and functions
 */
export const useSideBets = (groupId) => {
  const [sideBets, setSideBets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load side bets for the group
  const loadSideBets = useCallback(async () => {
    if (!groupId) {
      setSideBets([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await sideBetService.getSideBets(groupId);
      setSideBets(response.sideBets || []);
    } catch (err) {
      console.error('Error loading side bets:', err);
      setError(err.message || 'Failed to load side bets');
      setSideBets([]);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  // Load side bets when group changes
  useEffect(() => {
    loadSideBets();
  }, [loadSideBets]);

  // Create a new side bet
  const createSideBet = useCallback(
    async (sideBetData) => {
      if (!groupId) {
        throw new Error('No group selected');
      }

      setError(null);

      try {
        const response = await sideBetService.createSideBet(
          groupId,
          sideBetData
        );

        // Add the new side bet to the local state
        setSideBets((prev) => [...prev, response.sideBet]);

        return { success: true, sideBet: response.sideBet };
      } catch (err) {
        console.error('Error creating side bet:', err);
        const errorMessage = err.message || 'Failed to create side bet';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [groupId]
  );

  // Update an existing side bet
  const updateSideBet = useCallback(
    async (sideBetId, updateData) => {
      if (!groupId) {
        throw new Error('No group selected');
      }

      setError(null);

      try {
        const response = await sideBetService.updateSideBet(
          groupId,
          sideBetId,
          updateData
        );

        // Update the side bet in local state
        setSideBets((prev) =>
          prev.map((bet) => (bet.id === sideBetId ? response.sideBet : bet))
        );

        return { success: true, sideBet: response.sideBet };
      } catch (err) {
        console.error('Error updating side bet:', err);
        const errorMessage = err.message || 'Failed to update side bet';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [groupId]
  );

  // Delete a side bet
  const deleteSideBet = useCallback(
    async (sideBetId) => {
      if (!groupId) {
        throw new Error('No group selected');
      }

      setError(null);

      try {
        await sideBetService.deleteSideBet(groupId, sideBetId);

        // Remove the side bet from local state
        setSideBets((prev) => prev.filter((bet) => bet.id !== sideBetId));

        return { success: true };
      } catch (err) {
        console.error('Error deleting side bet:', err);
        const errorMessage = err.message || 'Failed to delete side bet';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [groupId]
  );

  // Get active side bets only
  const activeSideBets = sideBets.filter((bet) => bet.isActive !== false);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    sideBets,
    activeSideBets,
    loading,
    error,
    loadSideBets,
    createSideBet,
    updateSideBet,
    deleteSideBet,
    clearError,
  };
};
