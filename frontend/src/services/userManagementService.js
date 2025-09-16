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

export const resetUserPassword = async (userId) => {
  try {
    const data = await apiCall(`/users/manage/${userId}/reset-password`, {
      method: 'PUT'
    });

    return {
      success: true,
      user: data.user,
      tempPassword: data.tempPassword,
      instructions: data.instructions
    };
  } catch (error) {
    console.error('Failed to reset user password:', error);
    return { success: false, error: error.message };
  }
};

export const deleteUser = async (userId) => {
  try {
    const data = await apiCall(`/users/manage/${userId}`, {
      method: 'DELETE'
    });

    return {
      success: true,
      deletedUser: data.deletedUser,
      deletedMemberships: data.deletedMemberships,
      warnings: data.warnings || [],
      message: data.message
    };
  } catch (error) {
    console.error('Failed to delete user:', error);
    return { success: false, error: error.message };
  }
};

// Search for users by email or phone (for adding to groups)
export const searchUserByEmail = async (searchTerm) => {
  try {
    const data = await apiCall(`/users/manage?search=${encodeURIComponent(searchTerm)}&limit=1`, {
      method: 'GET'
    });

    return {
      success: true,
      users: data.users,
      found: data.users && data.users.length > 0,
      user: data.users && data.users.length > 0 ? data.users[0] : null
    };
  } catch (error) {
    console.error('Failed to search for user:', error);
    return { success: false, error: error.message, found: false };
  }
};

// Admin function to create a new user (similar to register but for admins)
export const createUser = async (userData) => {
  try {
    const data = await apiCall('/users/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });

    return { success: true, user: data.user };
  } catch (error) {
    console.error('Failed to create user:', error);
    return { 
      success: false, 
      error: error.message,
      statusCode: error.statusCode || error.status // Include status code if available
    };
  }
};
