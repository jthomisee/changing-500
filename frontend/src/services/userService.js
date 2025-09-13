import { apiCall } from './api';

// User search and management
export const searchUsers = async (query = '') => {
  try {
    const response = await apiCall(`/users/search?q=${encodeURIComponent(query)}`);
    return response.users || [];
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
};

export const createStubUser = async (userData) => {
  try {
    return await apiCall('/users/search', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  } catch (error) {
    console.error('Error creating stub user:', error);
    throw error;
  }
};
