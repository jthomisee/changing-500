import { apiCall } from './api';

/**
 * Service for managing group side bets
 */
export const sideBetService = {
  /**
   * Get all side bets for a group
   * @param {string} groupId - The group ID
   * @returns {Promise<Object>} Response with side bets array
   */
  async getSideBets(groupId) {
    if (!groupId) {
      throw new Error('Group ID is required');
    }

    const response = await apiCall(`/groups/${groupId}/side-bets`, {
      method: 'GET',
    });

    return response;
  },

  /**
   * Create a new side bet for a group
   * @param {string} groupId - The group ID
   * @param {Object} sideBetData - The side bet data
   * @param {string} sideBetData.name - Side bet name
   * @param {string} sideBetData.description - Side bet description (optional)
   * @param {number} sideBetData.amount - Side bet amount per person
   * @returns {Promise<Object>} Response with created side bet
   */
  async createSideBet(groupId, sideBetData) {
    if (!groupId) {
      throw new Error('Group ID is required');
    }

    if (!sideBetData.name || !sideBetData.name.trim()) {
      throw new Error('Side bet name is required');
    }

    if (!sideBetData.amount || sideBetData.amount <= 0) {
      throw new Error('Side bet amount must be greater than 0');
    }

    const payload = {
      name: sideBetData.name.trim(),
      description: sideBetData.description?.trim() || '',
      amount: parseFloat(sideBetData.amount),
      ...(sideBetData.defaultTimesParticipated !== undefined && {
        defaultTimesParticipated: parseInt(
          sideBetData.defaultTimesParticipated
        ),
      }),
    };

    const response = await apiCall(`/groups/${groupId}/side-bets`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return response;
  },

  /**
   * Update an existing side bet
   * @param {string} groupId - The group ID
   * @param {string} sideBetId - The side bet ID
   * @param {Object} updateData - The update data
   * @param {string} updateData.name - Side bet name (optional)
   * @param {string} updateData.description - Side bet description (optional)
   * @param {number} updateData.amount - Side bet amount per person (optional)
   * @param {boolean} updateData.isActive - Whether the side bet is active (optional)
   * @returns {Promise<Object>} Response with updated side bet
   */
  async updateSideBet(groupId, sideBetId, updateData) {
    if (!groupId) {
      throw new Error('Group ID is required');
    }

    if (!sideBetId) {
      throw new Error('Side bet ID is required');
    }

    const payload = {};

    if (updateData.name !== undefined) {
      if (!updateData.name.trim()) {
        throw new Error('Side bet name cannot be empty');
      }
      payload.name = updateData.name.trim();
    }

    if (updateData.description !== undefined) {
      payload.description = updateData.description?.trim() || '';
    }

    if (updateData.amount !== undefined) {
      if (updateData.amount <= 0) {
        throw new Error('Side bet amount must be greater than 0');
      }
      payload.amount = parseFloat(updateData.amount);
    }

    if (updateData.defaultTimesParticipated !== undefined) {
      const dtp = Number(updateData.defaultTimesParticipated);
      if (!Number.isInteger(dtp) || dtp < 0) {
        throw new Error('defaultTimesParticipated must be an integer >= 0');
      }
      payload.defaultTimesParticipated = parseInt(
        updateData.defaultTimesParticipated
      );
    }

    if (updateData.isActive !== undefined) {
      payload.isActive = Boolean(updateData.isActive);
    }

    const response = await apiCall(
      `/groups/${groupId}/side-bets/${sideBetId}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      }
    );

    return response;
  },

  /**
   * Delete a side bet
   * @param {string} groupId - The group ID
   * @param {string} sideBetId - The side bet ID
   * @returns {Promise<Object>} Response confirming deletion
   */
  async deleteSideBet(groupId, sideBetId) {
    if (!groupId) {
      throw new Error('Group ID is required');
    }

    if (!sideBetId) {
      throw new Error('Side bet ID is required');
    }

    const response = await apiCall(
      `/groups/${groupId}/side-bets/${sideBetId}`,
      {
        method: 'DELETE',
      }
    );

    return response;
  },
};
