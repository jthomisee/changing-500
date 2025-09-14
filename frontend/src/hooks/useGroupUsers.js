import { useState, useEffect, useCallback } from 'react';
import { listGroupUsers, createStubUser } from '../services/groupUserService';

export const useGroupUsers = (groupId) => {
  const [groupUsers, setGroupUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load group users
  const loadGroupUsers = useCallback(async () => {
    if (!groupId) {
      setGroupUsers([]);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await listGroupUsers(groupId);
      if (result.success) {
        setGroupUsers(result.users);
      } else {
        setError(result.error);
        setGroupUsers([]);
      }
    } catch (error) {
      console.error('Error loading group users:', error);
      setError(error.message);
      setGroupUsers([]);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  // Create new stub user
  const addStubUser = async (userData) => {
    if (!groupId) {
      return { success: false, error: 'No group selected' };
    }

    try {
      const result = await createStubUser(groupId, userData);
      if (result.success) {
        // Add the new user to the local list and sort it properly
        setGroupUsers(prevUsers => {
          const updatedUsers = [...prevUsers, result.user];
          // Sort: non-stub users first, then alphabetically
          return updatedUsers.sort((a, b) => {
            // Non-stub users first
            if (a.isStub && !b.isStub) return 1;
            if (!a.isStub && b.isStub) return -1;
            // Then by display name
            return a.displayName.localeCompare(b.displayName);
          });
        });
        console.log('Successfully created and added stub user:', result.user);
        return result;
      } else {
        console.error('Failed to create stub user:', result.error);
        return result;
      }
    } catch (error) {
      console.error('Error creating stub user:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  };

  // Load users when groupId changes
  useEffect(() => {
    loadGroupUsers();
  }, [loadGroupUsers]);

  return {
    groupUsers,
    loading,
    error,
    loadGroupUsers,
    addStubUser
  };
};
