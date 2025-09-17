import { API_BASE_URL } from '../constants/config';

// User Authentication
export const registerUser = async (userData) => {
  try {
    const sanitized = Object.fromEntries(
      Object.entries(userData).filter(
        ([_, v]) => v !== null && v !== undefined && v !== ''
      )
    );
    const response = await fetch(`${API_BASE_URL}/users/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sanitized),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Registration failed');
    }

    const data = await response.json();
    return { success: true, user: data.user };
  } catch (error) {
    console.error('Registration failed:', error);
    return { success: false, error: error.message };
  }
};

export const loginUser = async (username, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Login failed');
    }

    const data = await response.json();
    return {
      success: true,
      user: data.user,
      token: data.token,
      expiresIn: data.expiresIn,
    };
  } catch (error) {
    console.error('Login failed:', error);
    return { success: false, error: error.message };
  }
};

// Session Management
export const setUserSession = (token, expiresInSeconds, user) => {
  const expirationTime = Date.now() + expiresInSeconds * 1000;
  localStorage.setItem(
    'userSession',
    JSON.stringify({
      token: token,
      user: user,
      expiresAt: expirationTime,
    })
  );
};

export const getUserSession = () => {
  try {
    const session = localStorage.getItem('userSession');
    if (!session) return null;

    const { token, user, expiresAt } = JSON.parse(session);

    if (Date.now() > expiresAt) {
      clearUserSession();
      return null;
    }

    return { token, user, expiresAt };
  } catch (error) {
    console.error('Error reading user session:', error);
    clearUserSession();
    return null;
  }
};

export const clearUserSession = () => {
  localStorage.removeItem('userSession');
};
