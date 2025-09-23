import { apiCall } from './api';

// User search and management
export const searchUsers = async (
  query = '',
  limit = 10,
  lastEvaluatedKey = null
) => {
  try {
    let url = `/users/search?search=${encodeURIComponent(query)}&limit=${limit}`;
    if (lastEvaluatedKey) {
      url += `&lastEvaluatedKey=${encodeURIComponent(lastEvaluatedKey)}`;
    }
    const response = await apiCall(url);
    return {
      users: response.users || [],
      hasMore: response.hasMore || false,
      lastEvaluatedKey: response.lastEvaluatedKey || null,
    };
  } catch (error) {
    console.error('Error searching users:', error);
    return {
      users: [],
      hasMore: false,
      lastEvaluatedKey: null,
    };
  }
};

export const createUserFromSearch = async (userData) => {
  try {
    return await apiCall('/users/search', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};
