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

// Create a new stub user in a group
export const createStubUser = async (groupId, userData) => {
  try {
    console.log('Calling createStubUser API:', { groupId, userData });
    
    const data = await apiCall(`/groups/${groupId}/stub-users`, {
      method: 'POST',
      body: JSON.stringify({
        ...userData,
        groupId
      })
    });
    
    console.log('createStubUser API response:', data);
    
    return {
      success: true,
      user: data.user,
      message: data.message
    };
  } catch (error) {
    console.error('Failed to create stub user:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};
