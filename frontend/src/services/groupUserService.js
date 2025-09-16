import { apiCall } from './api.js';

// Get all users in a specific group
export const listGroupUsers = async (groupId) => {
  try {
    const data = await apiCall(`/groups/${groupId}/users`, {
      method: 'GET'
    });
    return {
      success: true,
      users: data.users,
      count: data.count
    };
  } catch (error) {
    console.error('Failed to load group users:', error);
    return { 
      success: false, 
      error: error.message,
      users: []
    };
  }
};

// Create a new user in a group (requires email or phone)
export const createGroupUser = async (groupId, userData) => {
  try {
    const data = await apiCall(`/groups/${groupId}/users`, {
      method: 'POST',
      body: JSON.stringify({
        ...userData,
        groupId
      })
    });
    
    console.log('createGroupUser API response:', data);
    
    return {
      success: true,
      user: data.user,
      message: data.message
    };
  } catch (error) {
    console.error('Failed to create user:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};
