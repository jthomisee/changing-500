import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  registerUser as registerUserAPI,
  loginUser as loginUserAPI,
  setUserSession,
  getUserSession,
  clearUserSession
} from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  // User state  
  const [currentUser, setCurrentUser] = useState(null);
  const [userToken, setUserToken] = useState(null);
  
  // Loading states
  const [loading, setLoading] = useState(false);

  // Check for existing sessions on app load
  useEffect(() => {
    const userSession = getUserSession();
    if (userSession && userSession.token && userSession.user) {
      setUserToken(userSession.token);
      setCurrentUser(userSession.user);
    }
  }, []);


  // Authentication functions
  const handleUserRegister = async (userData) => {
    const { email, password, firstName, lastName, phone, isAdmin } = userData;
    if (!password || !firstName || !lastName) {
      throw new Error('Please fill in all required fields');
    }
    if (!email && !phone) {
      throw new Error('Please provide either an email address or phone number');
    }

    setLoading(true);
    try {
      const result = await registerUserAPI({ email, password, firstName, lastName, phone, isAdmin });
      return result;
    } finally {
      setLoading(false);
    }
  };

  const handleUserLogin = async (username, password) => {
    if (!username || !password) {
      throw new Error('Please enter username (email or phone) and password');
    }

    setLoading(true);
    try {
      const result = await loginUserAPI(username, password);
      if (result.success) {
        setCurrentUser(result.user);
        setUserToken(result.token);
        setUserSession(result.token, result.expiresIn, result.user);
      }
      return result;
    } finally {
      setLoading(false);
    }
  };

  const refreshCurrentUser = (updatedUser) => {
    setCurrentUser(updatedUser);
    if (userToken) {
      setUserSession(userToken, 24 * 3600, updatedUser); // Update session with new user data
    }
  };

  const handleUserLogout = () => {
    setCurrentUser(null);
    setUserToken(null);
    clearUserSession();
  };

  const value = {
    // User state
    currentUser,
    userToken,
    
    // Derived state
    isAdmin: currentUser?.isAdmin || false,
    isAuthenticated: !!currentUser,
    loading,
    
    // Authentication functions
    handleUserRegister,
    handleUserLogin,
    handleUserLogout,
    refreshCurrentUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
