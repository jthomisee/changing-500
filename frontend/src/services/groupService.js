import { apiCall } from './api.js';

export const listGroups = async () => {
  try {
    const data = await apiCall('/groups', {
      method: 'GET',
    });

    return {
      success: true,
      groups: data.groups,
      count: data.count,
      isAdmin: data.isAdmin || false,
    };
  } catch (error) {
    console.error('Failed to load user groups:', error);
    return { success: false, error: error.message };
  }
};

export const createGroup = async (groupData) => {
  try {
    const data = await apiCall('/groups', {
      method: 'POST',
      body: JSON.stringify(groupData),
    });

    return { success: true, group: data.group };
  } catch (error) {
    console.error('Failed to create group:', error);
    return { success: false, error: error.message };
  }
};

export const joinGroup = async (groupId) => {
  try {
    const data = await apiCall(`/groups/${groupId}/join`, {
      method: 'POST',
    });

    return { success: true, group: data.group, membership: data.membership };
  } catch (error) {
    console.error('Failed to join group:', error);
    return { success: false, error: error.message };
  }
};

export const listPublicGroups = async (
  searchTerm = '',
  limit = 20,
  lastKey = null
) => {
  try {
    const queryParams = new URLSearchParams();
    if (searchTerm) queryParams.append('search', searchTerm);
    if (limit) queryParams.append('limit', limit.toString());
    if (lastKey) queryParams.append('lastKey', lastKey);

    const queryString = queryParams.toString();
    const url = `/groups/public${queryString ? '?' + queryString : ''}`;

    const data = await apiCall(url, {
      method: 'GET',
    });

    return {
      success: true,
      groups: data.groups || [],
      pagination: data.pagination || {},
      searchTerm: data.searchTerm,
    };
  } catch (error) {
    console.error('Failed to list public groups:', error);
    return { success: false, error: error.message };
  }
};

// Group member management functions

export const listGroupMembers = async (groupId) => {
  try {
    const data = await apiCall(`/groups/${groupId}/members`, {
      method: 'GET',
    });

    return { success: true, members: data.members, count: data.count };
  } catch (error) {
    console.error('Failed to list group members:', error);
    return { success: false, error: error.message };
  }
};

export const addGroupMember = async (groupId, userId, role = 'member') => {
  try {
    const data = await apiCall(`/groups/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId, role }),
    });

    return { success: true, membership: data.membership };
  } catch (error) {
    console.error('Failed to add group member:', error);
    return { success: false, error: error.message };
  }
};

export const updateMemberRole = async (groupId, userId, role) => {
  try {
    const data = await apiCall(`/groups/${groupId}/members/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });

    return { success: true, membership: data.membership };
  } catch (error) {
    console.error('Failed to update member role:', error);
    return { success: false, error: error.message };
  }
};

export const removeGroupMember = async (groupId, userId) => {
  try {
    const data = await apiCall(`/groups/${groupId}/members/${userId}`, {
      method: 'DELETE',
    });

    return { success: true, message: data.message };
  } catch (error) {
    console.error('Failed to remove group member:', error);
    return { success: false, error: error.message };
  }
};

export const updateGroup = async (groupId, groupData) => {
  try {
    const data = await apiCall(`/groups/${groupId}`, {
      method: 'PUT',
      body: JSON.stringify(groupData),
    });

    return { success: true, group: data.group };
  } catch (error) {
    console.error('Failed to update group:', error);
    return { success: false, error: error.message };
  }
};
