import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Crown,
  UserMinus,
  UserPlus,
  Search,
  Loader,
  X,
  Save,
  Mail,
  Eye,
  EyeOff,
  Settings,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  listGroupMembers,
  updateMemberRole,
  removeGroupMember,
  addGroupMember,
  updateGroup,
  deleteGroup,
} from '../../services/groupService';
import {
  searchUserByEmail,
  createUser,
} from '../../services/userManagementService';

const GroupManagement = ({ selectedGroup, onClose, onGroupDeleted }) => {
  // Authentication
  const { isAdmin, currentUser } = useAuth();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [updating, setUpdating] = useState(false);

  // Group settings state
  const [updatingSettings, setUpdatingSettings] = useState(false);

  // Add user to group state
  const [showAddUser, setShowAddUser] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [searching, setSearching] = useState(false);
  const [addingUser, setAddingUser] = useState(false);
  const [userFormError, setUserFormError] = useState('');
  const [userFormSuccess, setUserFormSuccess] = useState('');

  // New user creation form state
  const [newUserForm, setNewUserForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  // Load group members
  const loadMembers = useCallback(async () => {
    if (!selectedGroup) return;

    setLoading(true);
    setError('');
    try {
      const result = await listGroupMembers(selectedGroup.groupId);
      if (result.success) {
        setMembers(result.members);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to load group members');
    } finally {
      setLoading(false);
    }
  }, [selectedGroup]);

  // Update member role
  const handleRoleUpdate = async (userId, currentRole) => {
    const newRole = currentRole === 'owner' ? 'member' : 'owner';
    const memberName =
      members.find((m) => m.userId === userId)?.firstName || 'User';

    if (
      !window.confirm(
        `${newRole === 'owner' ? 'Promote' : 'Demote'} ${memberName} ${newRole === 'owner' ? 'to owner' : 'to member'}?`
      )
    ) {
      return;
    }

    setUpdating(true);
    setError('');
    setSuccessMessage('');
    try {
      const result = await updateMemberRole(
        selectedGroup.groupId,
        userId,
        newRole
      );
      if (result.success) {
        await loadMembers(); // Refresh the list
        setSuccessMessage(
          `${memberName} has been ${newRole === 'owner' ? 'promoted to owner' : 'demoted to member'}`
        );
      } else {
        setError(`Failed to update role: ${result.error}`);
      }
    } catch (err) {
      setError(`Failed to update role: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  // Remove member
  const handleRemoveMember = async (userId) => {
    const memberName =
      members.find((m) => m.userId === userId)?.firstName || 'User';

    if (!window.confirm(`Remove ${memberName} from this group?`)) {
      return;
    }

    setUpdating(true);
    setError('');
    setSuccessMessage('');
    try {
      const result = await removeGroupMember(selectedGroup.groupId, userId);
      if (result.success) {
        await loadMembers(); // Refresh the list
        setSuccessMessage(`${memberName} has been removed from the group`);
      } else {
        setError(`Failed to remove member: ${result.error}`);
      }
    } catch (err) {
      setError(`Failed to remove member: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  // Search for user by email or phone
  const handleSearchUser = async () => {
    if (!searchEmail.trim()) {
      setUserFormError('Please enter an email address or phone number');
      return;
    }

    setSearching(true);
    setSearchResult(null);
    setShowCreateUser(false);
    setUserFormError('');
    setUserFormSuccess('');

    try {
      const result = await searchUserByEmail(searchEmail.trim());
      if (result.success) {
        if (result.found) {
          // Check if user is already in the group
          const isAlreadyMember = members.some(
            (member) => member.email === result.user.email
          );
          if (isAlreadyMember) {
            setUserFormError('This user is already a member of this group');
            setSearchResult(null);
          } else {
            setSearchResult(result.user);
          }
        } else {
          // User not found, offer to create
          setNewUserForm({
            email: searchEmail.trim(),
            firstName: '',
            lastName: '',
            phone: '',
            password: '',
            confirmPassword: '',
          });
          setShowCreateUser(true);
          setSearchResult(null);
        }
      } else {
        setUserFormError(`Search failed: ${result.error}`);
      }
    } catch (err) {
      setUserFormError(`Search failed: ${err.message}`);
    } finally {
      setSearching(false);
    }
  };

  // Add existing user to group
  const handleAddExistingUser = async (user, role = 'member') => {
    setAddingUser(true);
    setUserFormError('');
    setUserFormSuccess('');
    try {
      const result = await addGroupMember(
        selectedGroup.groupId,
        user.userId,
        role
      );
      if (result.success) {
        await loadMembers(); // Refresh the list
        setUserFormSuccess(
          `${user.firstName} ${user.lastName} has been added to the group!`
        );
        handleCancelAddUser(); // Close the add user form
      } else {
        setUserFormError(`Failed to add user: ${result.error}`);
      }
    } catch (err) {
      setUserFormError(`Failed to add user: ${err.message}`);
    } finally {
      setAddingUser(false);
    }
  };

  // Create new user and add to group
  const handleCreateAndAddUser = async () => {
    // Validate form
    if (
      !newUserForm.firstName ||
      !newUserForm.lastName ||
      !newUserForm.password
    ) {
      setUserFormError('Please fill in all required fields');
      return;
    }

    if (!newUserForm.email && !newUserForm.phone) {
      setUserFormError(
        'Please provide either an email address or phone number'
      );
      return;
    }

    if (newUserForm.password !== newUserForm.confirmPassword) {
      setUserFormError('Passwords do not match');
      return;
    }

    if (newUserForm.password.length < 6) {
      setUserFormError('Password must be at least 6 characters long');
      return;
    }

    setAddingUser(true);
    setUserFormError('');
    setUserFormSuccess('');
    try {
      // Create the user
      const createResult = await createUser({
        email: newUserForm.email,
        firstName: newUserForm.firstName,
        lastName: newUserForm.lastName,
        phone: newUserForm.phone || undefined,
        password: newUserForm.password,
      });

      if (createResult.success) {
        // Add user to group
        const addResult = await addGroupMember(
          selectedGroup.groupId,
          createResult.user.userId,
          'member'
        );
        if (addResult.success) {
          await loadMembers(); // Refresh the list
          setUserFormSuccess(
            `${newUserForm.firstName} ${newUserForm.lastName} has been created and added to the group!`
          );
          handleCancelAddUser(); // Close the add user form
        } else {
          setUserFormError(
            `User created but failed to add to group: ${addResult.error}`
          );
        }
      } else {
        setUserFormError(`Failed to create user: ${createResult.error}`);
      }
    } catch (err) {
      setUserFormError(`Failed to create user: ${err.message}`);
    } finally {
      setAddingUser(false);
    }
  };

  // Cancel add user flow
  const handleCancelAddUser = () => {
    setShowAddUser(false);
    setSearchEmail('');
    setSearchResult(null);
    setShowCreateUser(false);
    setUserFormError('');
    setUserFormSuccess('');
    setNewUserForm({
      email: '',
      firstName: '',
      lastName: '',
      phone: '',
      password: '',
      confirmPassword: '',
    });
  };

  // Toggle group public/private setting
  const handleTogglePublic = async () => {
    if (!selectedGroup) return;

    setUpdatingSettings(true);
    setError('');
    setSuccessMessage('');
    try {
      const currentIsPublic = selectedGroup.isPublic === true; // Treat undefined as false
      const newIsPublic = !currentIsPublic;
      const result = await updateGroup(selectedGroup.groupId, {
        isPublic: newIsPublic,
      });

      if (result.success) {
        // Update the selectedGroup data locally
        selectedGroup.isPublic = newIsPublic;
        setSuccessMessage(
          `Group visibility updated to ${newIsPublic ? 'public' : 'private'}`
        );
      } else {
        setError(`Failed to update group visibility: ${result.error}`);
      }
    } catch (error) {
      setError(`Failed to update group visibility: ${error.message}`);
    } finally {
      setUpdatingSettings(false);
    }
  };

  // Delete group
  const handleDeleteGroup = async () => {
    if (!selectedGroup) return;

    const confirmMessage = `Are you sure you want to delete the group "${selectedGroup.name}"?\n\nThis action cannot be undone and will:\n• Remove all group memberships\n• Delete ALL games associated with this group\n• Delete all game results and statistics\n\nThis is a permanent action that cannot be reversed.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setUpdatingSettings(true);
    try {
      const result = await deleteGroup(selectedGroup.groupId);
      if (result.success) {
        // Call the callback to handle post-deletion navigation
        if (onGroupDeleted) {
          onGroupDeleted(selectedGroup.groupId);
        } else {
          onClose(); // Fallback to just closing the panel
        }
      } else {
        setError(`Failed to delete group: ${result.error}`);
      }
    } catch (error) {
      setError(`Failed to delete group: ${error.message}`);
    } finally {
      setUpdatingSettings(false);
    }
  };

  // Check if current user can add users to this group
  const canAddUsers = () => {
    if (isAdmin) return true; // Admins can always add users
    if (!currentUser || !selectedGroup) return false;

    // Check if current user is owner of this group
    const currentUserMembership = members.find(
      (member) => member.userId === currentUser.userId
    );
    return currentUserMembership?.role === 'owner';
  };

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  if (!selectedGroup) {
    return (
      <div className="text-center py-8">
        <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Select a group to manage members</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Group Members</h2>
            <p className="text-gray-600">{selectedGroup.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Add User Button - Only show for admins and group owners */}
          {canAddUsers() && (
            <button
              onClick={() => setShowAddUser(true)}
              disabled={updating}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UserPlus className="w-4 h-4" />
              Add User
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Close
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Success Display */}
      {successMessage && (
        <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {successMessage}
        </div>
      )}

      {/* Group Settings */}
      {(selectedGroup?.userRole === 'owner' || isAdmin) && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Settings className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Group Settings
            </h3>
          </div>

          <div className="space-y-4">
            {/* Public Group Toggle */}
            <div className="flex items-center justify-between py-3 px-4 bg-white rounded-lg border border-gray-200">
              <div className="flex items-center gap-3">
                <Eye
                  className={`w-5 h-5 ${selectedGroup?.isPublic === true ? 'text-green-600' : 'text-gray-400'}`}
                />
                <div>
                  <p className="font-medium text-gray-900">Public Group</p>
                  <p className="text-sm text-gray-600">
                    {selectedGroup?.isPublic === true
                      ? 'Anyone can find and join this group'
                      : 'Only invited members can join this group (Private)'}
                  </p>
                </div>
              </div>

              <button
                onClick={handleTogglePublic}
                disabled={updatingSettings}
                className={`relative inline-flex h-7 w-12 sm:h-6 sm:w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
                  selectedGroup?.isPublic === true
                    ? 'bg-green-600'
                    : 'bg-gray-400 hover:bg-gray-500'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 sm:h-4 sm:w-4 transform rounded-full bg-white transition-transform ${
                    selectedGroup?.isPublic === true
                      ? 'translate-x-6 sm:translate-x-6'
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Delete Group */}
            <div className="flex items-center justify-between py-3 px-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-3">
                <Trash2 className="w-5 h-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-900">Delete Group</p>
                  <p className="text-sm text-red-700">
                    Permanently delete this group, all games, and remove all
                    members. Cannot be undone.
                  </p>
                </div>
              </div>

              <button
                onClick={handleDeleteGroup}
                disabled={updatingSettings}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                {updatingSettings ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Members List */}
      {loading ? (
        <div className="text-center py-8">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading members...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {members.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No members found</p>
            </div>
          ) : (
            members.map((member) => (
              <div
                key={member.userId}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border border-gray-200 rounded-lg"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    {member.role === 'owner' && (
                      <Crown className="w-5 h-5 text-yellow-600" />
                    )}
                    {member.role === 'member' && (
                      <Users className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900">
                      {member.firstName} {member.lastName}
                    </p>
                    <p className="text-sm text-gray-600 truncate sm:whitespace-normal">
                      <span className="hidden sm:inline">
                        {member.email || 'No email'}
                      </span>
                      <span className="sm:hidden">
                        {member.email && member.email.length > 20
                          ? `${member.email.substring(0, 20)}...`
                          : member.email || 'No email'}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500">
                      {member.role === 'owner' ? '👑 Group Owner' : '👤 Member'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRoleUpdate(member.userId, member.role)}
                    disabled={updating}
                    className={`px-3 py-1 text-xs rounded-full border ${
                      member.role === 'owner'
                        ? 'border-yellow-300 text-yellow-700 hover:bg-yellow-50'
                        : 'border-blue-300 text-blue-700 hover:bg-blue-50'
                    } disabled:opacity-50`}
                  >
                    {member.role === 'owner'
                      ? 'Demote to Member'
                      : 'Promote to Owner'}
                  </button>

                  <button
                    onClick={() => handleRemoveMember(member.userId)}
                    disabled={updating}
                    className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded disabled:opacity-50"
                    title="Remove from group"
                  >
                    <UserMinus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-semibold text-blue-900">
                Add User to Group
              </h3>
              <button
                onClick={handleCancelAddUser}
                disabled={addingUser}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {/* User Form Error/Success Display */}
              {userFormError && (
                <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {userFormError}
                </div>
              )}
              {userFormSuccess && (
                <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                  {userFormSuccess}
                </div>
              )}

              {/* Search for existing user */}
              {!showCreateUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search by Email or Phone Number
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        value={searchEmail}
                        onChange={(e) => setSearchEmail(e.target.value)}
                        placeholder="Enter email or phone number..."
                        disabled={searching}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                        onKeyPress={(e) =>
                          e.key === 'Enter' && handleSearchUser()
                        }
                      />
                    </div>
                    <button
                      onClick={handleSearchUser}
                      disabled={searching || !searchEmail.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {searching ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                      Search
                    </button>
                  </div>

                  {/* Search Result - Found User */}
                  {searchResult && (
                    <div className="mt-6 p-5 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium text-green-900">
                            {searchResult.firstName} {searchResult.lastName}
                          </p>
                          <p className="text-sm text-green-700">
                            {searchResult.email}
                          </p>
                          {searchResult.phone && (
                            <p className="text-sm text-green-700">
                              {searchResult.phone}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              handleAddExistingUser(searchResult, 'member')
                            }
                            disabled={addingUser}
                            className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
                          >
                            Member
                          </button>
                          <button
                            onClick={() =>
                              handleAddExistingUser(searchResult, 'owner')
                            }
                            disabled={addingUser}
                            className="px-2 py-1 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700 disabled:opacity-50"
                          >
                            Owner
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Create New User Form - Only show for admins */}
              {showCreateUser && (
                <div>
                  <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 text-sm">
                      No user found with email{' '}
                      <strong>{newUserForm.email}</strong>.
                      {isAdmin ? (
                        <>Create a new user account:</>
                      ) : (
                        <>
                          Only administrators can create new user accounts.
                          Please ask an admin to create this user first, or
                          search for an existing user.
                        </>
                      )}
                    </p>
                  </div>

                  {!isAdmin && (
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => setShowCreateUser(false)}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                      >
                        Back to Search
                      </button>
                    </div>
                  )}

                  {isAdmin && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            First Name *
                          </label>
                          <input
                            type="text"
                            value={newUserForm.firstName}
                            onChange={(e) =>
                              setNewUserForm({
                                ...newUserForm,
                                firstName: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={addingUser}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Last Name *
                          </label>
                          <input
                            type="text"
                            value={newUserForm.lastName}
                            onChange={(e) =>
                              setNewUserForm({
                                ...newUserForm,
                                lastName: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={addingUser}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone (optional)
                        </label>
                        <input
                          type="tel"
                          value={newUserForm.phone}
                          onChange={(e) =>
                            setNewUserForm({
                              ...newUserForm,
                              phone: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          disabled={addingUser}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Password *
                        </label>
                        <input
                          type="password"
                          value={newUserForm.password}
                          onChange={(e) =>
                            setNewUserForm({
                              ...newUserForm,
                              password: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Minimum 6 characters"
                          disabled={addingUser}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Confirm Password *
                        </label>
                        <input
                          type="password"
                          value={newUserForm.confirmPassword}
                          onChange={(e) =>
                            setNewUserForm({
                              ...newUserForm,
                              confirmPassword: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          disabled={addingUser}
                        />
                      </div>

                      <div className="flex gap-3 pt-4">
                        <button
                          onClick={() => setShowCreateUser(false)}
                          disabled={addingUser}
                          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                        >
                          Back to Search
                        </button>
                        <button
                          onClick={handleCreateAndAddUser}
                          disabled={addingUser}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {addingUser ? (
                            <Loader className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          Create & Add User
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupManagement;
