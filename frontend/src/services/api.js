import { API_BASE_URL } from '../constants/config';

// Generic API helper function
export const apiCall = async (endpoint, options = {}) => {
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    // Add JWT token to headers for authenticated requests
    const userToken = getUserToken();
    
    if (userToken) {
      headers.Authorization = `Bearer ${userToken}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers,
      ...options
    });

    if (response.status === 401) {
      // Token expired - handle session cleanup
      if (userToken) {
        handleUserTokenExpired();
      }
      throw new Error('Authentication expired. Please login again.');
    }

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API call to ${endpoint} failed:`, error);
    throw error;
  }
};

// Token management helpers

const getUserToken = () => {
  try {
    const session = localStorage.getItem('userSession');
    if (!session) return null;
    
    const { token, expiresAt } = JSON.parse(session);
    if (Date.now() > expiresAt) {
      localStorage.removeItem('userSession');
      return null;
    }
    
    return token;
  } catch (error) {
    console.error('Error reading user session:', error);
    localStorage.removeItem('userSession');
    return null;
  }
};

const handleUserTokenExpired = () => {
  localStorage.removeItem('userSession');
  // This will be handled by context later
  console.log('User session expired');
};
