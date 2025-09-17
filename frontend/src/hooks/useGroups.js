import { useState, useEffect, useCallback } from 'react';
import { listGroups, createGroup } from '../services/groupService.js';
import { useAuth } from '../context/AuthContext.jsx';

export const useGroups = () => {
  const { currentUser, isAuthenticated } = useAuth();
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [groupError, setGroupError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  const loadGroups = useCallback(async () => {
    if (!isAuthenticated || !currentUser) {
      setGroups([]);
      setSelectedGroup(null);
      setIsAdmin(false);
      return;
    }

    setLoadingGroups(true);
    setGroupError('');
    try {
      const result = await listGroups();
      if (result.success) {
        setGroups(result.groups);
        setIsAdmin(result.isAdmin || false);
      } else {
        setGroupError(result.error);
        setIsAdmin(false);
        setGroups([]);
      }
    } catch (err) {
      setGroupError('Failed to load groups');
      setIsAdmin(false);
      setGroups([]);
    } finally {
      setLoadingGroups(false);
    }
  }, [isAuthenticated, currentUser]);

  const selectGroup = (group) => {
    setSelectedGroup(group);
    // Store selection in localStorage for persistence
    if (group) {
      localStorage.setItem('selectedGroupId', group.groupId);
    } else {
      localStorage.removeItem('selectedGroupId');
    }
  };

  const createNewGroup = async (groupData) => {
    if (!isAuthenticated || !currentUser) {
      return { success: false, error: 'Authentication required' };
    }

    try {
      const result = await createGroup(groupData);
      if (result.success) {
        // Add the new group to the list and select it
        const newGroup = {
          ...result.group,
          userRole: 'owner',
          actualMember: true,
        };
        setGroups((prev) =>
          [...prev, newGroup].sort((a, b) => a.name.localeCompare(b.name))
        );
        setSelectedGroup(newGroup);
        localStorage.setItem('selectedGroupId', newGroup.groupId);
        return { success: true, group: newGroup };
      }
      return result;
    } catch (error) {
      console.error('Error creating group:', error);
      return { success: false, error: error.message };
    }
  };

  // Load groups when authentication state changes
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      loadGroups();
    } else {
      // Clear groups when not authenticated
      setGroups([]);
      setSelectedGroup(null);
      setIsAdmin(false);
    }
  }, [isAuthenticated, currentUser, loadGroups]);

  // Restore selected group from localStorage when groups are loaded
  useEffect(() => {
    if (groups.length > 0 && !selectedGroup && isAuthenticated) {
      const savedGroupId = localStorage.getItem('selectedGroupId');
      if (savedGroupId) {
        const savedGroup = groups.find((g) => g.groupId === savedGroupId);
        if (savedGroup) {
          setSelectedGroup(savedGroup);
        } else {
          // Saved group not found, select first available
          setSelectedGroup(groups[0]);
          localStorage.setItem('selectedGroupId', groups[0].groupId);
        }
      } else {
        // No saved group, select first available
        setSelectedGroup(groups[0]);
        localStorage.setItem('selectedGroupId', groups[0].groupId);
      }
    }
  }, [groups, selectedGroup, isAuthenticated]);

  return {
    groups,
    selectedGroup,
    loadingGroups,
    groupError,
    isAdmin,
    loadGroups,
    selectGroup,
    createNewGroup,
  };
};
