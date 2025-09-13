import { apiCall } from './api';

// User profile management functions
export const updateMyProfile = async (userData) => {
  try {
    const response = await apiCall(`/users/profile`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update profile');
    }

    const data = await response.json();
    return { success: true, user: data.user };
  } catch (error) {
    console.error('Failed to update profile:', error);
    return { success: false, error: error.message };
  }
};

// User password change functions
export const changePassword = async (passwordData) => {
  try {
    const response = await apiCall(`/users/password`, {
      method: 'PUT',
      body: JSON.stringify(passwordData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to change password');
    }

    const data = await response.json();
    return { success: true, message: data.message };
  } catch (error) {
    console.error('Failed to change password:', error);
    return { success: false, error: error.message };
  }
};
