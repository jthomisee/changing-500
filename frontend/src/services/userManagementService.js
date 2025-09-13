import { apiCall } from './api';

// Admin-only user management functions
export const listAllUsers = async (searchTerm = '', limit = 50) => {
  try {
    let queryParams = `?limit=${limit}`;
    if (searchTerm) {
      queryParams += `&search=${encodeURIComponent(searchTerm)}`;
    }

    const data = await apiCall(`/users/manage${queryParams}`, {
      method: 'GET'
    });

    return { success: true, users: data.users, count: data.count };
  } catch (error) {
    console.error('Failed to load users:', error);
    return { success: false, error: error.message };
  }
};

export const updateUserById = async (userId, userData) => {
  try {
    const data = await apiCall(`/users/manage/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });

    return { success: true, user: data.user };
  } catch (error) {
    console.error('Failed to update user:', error);
    return { success: false, error: error.message };
  }
};
