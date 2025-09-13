import { useState } from 'react';
import { searchUsers } from '../services/userService';

export const useUsers = () => {
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Search for users
  const searchForUsers = async (query = '') => {
    if (query.length < 2) {
      setAvailableUsers([]);
      return [];
    }

    setLoading(true);
    try {
      const users = await searchUsers(query);
      setAvailableUsers(users);
      return users;
    } catch (error) {
      console.error('Error searching users:', error);
      setAvailableUsers([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Clear user search results
  const clearUsers = () => {
    setAvailableUsers([]);
  };

  return {
    availableUsers,
    loading,
    searchForUsers,
    clearUsers
  };
};
