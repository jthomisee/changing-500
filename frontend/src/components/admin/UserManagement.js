import React, { useState, useEffect, useCallback } from 'react';
import { Search, Edit, Users, Crown, X, Save, Loader, RotateCcw, Copy, Eye, EyeOff, Trash2, UserPlus, GitMerge } from 'lucide-react';
import { listAllUsers, updateUserById, resetUserPassword, deleteUser, mergeStubUser, createUser } from '../../services/userManagementService';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    isAdmin: false
  });
  const [saving, setSaving] = useState(false);

  // Password reset state
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetUserId, setResetUserId] = useState(null);
  const [resetUserName, setResetUserName] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [showTempPassword, setShowTempPassword] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  // Delete user states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState('');
  const [deleteUserName, setDeleteUserName] = useState('');
  const [deletingUser, setDeletingUser] = useState(false);

  // Stub management states
  const [showConvertStub, setShowConvertStub] = useState(false);
  const [convertStubUser, setConvertStubUser] = useState(null);
  const [convertForm, setConvertForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: ''
  });
  const [convertingStub, setConvertingStub] = useState(false);
  const [useRandomPasswordConvert, setUseRandomPasswordConvert] = useState(false);
  const [generatedPasswordConvert, setGeneratedPasswordConvert] = useState('');

  const [showMergeStub, setShowMergeStub] = useState(false);
  const [mergeStubUserData, setMergeStubUserData] = useState(null);
  const [selectedTargetUser, setSelectedTargetUser] = useState('');
  const [mergingStub, setMergingStub] = useState(false);

  // Create new user states
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    isAdmin: false
  });
  const [creatingUser, setCreatingUser] = useState(false);
  const [useRandomPassword, setUseRandomPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listAllUsers(searchTerm);
      if (result.success) {
        setUsers(result.users);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadUsers();
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setEditForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phone: user.phone || '',
      isAdmin: user.isAdmin || false
    });
  };

  const closeEditModal = () => {
    setEditingUser(null);
    setEditForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      isAdmin: false
    });
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    setSaving(true);
    try {
      const result = await updateUserById(editingUser.userId, editForm);
      if (result.success) {
        // Update the user in the local state
        setUsers(prev => prev.map(u => 
          u.userId === editingUser.userId ? result.user : u
        ));
        closeEditModal();
        setError('');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPasswordClick = (user) => {
    setResetUserId(user.userId);
    setResetUserName(`${user.firstName} ${user.lastName}`);
    setShowResetConfirm(true);
    setTempPassword('');
    setShowTempPassword(false);
  };

  const handleResetPasswordConfirm = async () => {
    if (!resetUserId) return;

    setResettingPassword(true);
    try {
      const result = await resetUserPassword(resetUserId);
      if (result.success) {
        setTempPassword(result.tempPassword);
        setShowTempPassword(true);
        setShowResetConfirm(false);
        setError('');
        // Update the user in local state (passwordResetRequired flag)
        setUsers(prev => prev.map(u => 
          u.userId === resetUserId ? result.user : u
        ));
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to reset password');
    } finally {
      setResettingPassword(false);
    }
  };

  const handleResetPasswordCancel = () => {
    setShowResetConfirm(false);
    setResetUserId(null);
    setResetUserName('');
    setTempPassword('');
    setShowTempPassword(false);
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const closeTempPasswordModal = () => {
    setShowTempPassword(false);
    setTempPassword('');
    setPasswordVisible(false);
  };

  // Delete user functions
  const handleDeleteUserClick = (user) => {
    setDeleteUserId(user.userId);
    setDeleteUserName(`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email);
    setShowDeleteConfirm(true);
  };

  const handleDeleteUserConfirm = async () => {
    if (!deleteUserId) return;

    setDeletingUser(true);
    try {
      const result = await deleteUser(deleteUserId);
      
      if (result.success) {
        // Remove user from the list
        setUsers(prevUsers => prevUsers.filter(user => user.userId !== deleteUserId));
        
        // Show success message with warnings if any
        let message = result.message;
        if (result.warnings && result.warnings.length > 0) {
          message += '\n\nWarnings:\n' + result.warnings.join('\n');
        }
        
        alert(message);
        handleDeleteUserCancel();
      } else {
        alert('Failed to delete user: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user: ' + error.message);
    } finally {
      setDeletingUser(false);
    }
  };

  const handleDeleteUserCancel = () => {
    setShowDeleteConfirm(false);
    setDeleteUserId('');
    setDeleteUserName('');
  };

  // Stub management handlers
  const handleConvertStubClick = (user) => {
    setConvertStubUser(user);
    setConvertForm({
      email: user.email || '',
      password: '',
      confirmPassword: '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phone: user.phone || ''
    });
    setUseRandomPasswordConvert(false);
    setGeneratedPasswordConvert('');
    setShowConvertStub(true);
  };

  const handleConvertStubCancel = () => {
    setShowConvertStub(false);
    setConvertStubUser(null);
    setConvertForm({
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      phone: ''
    });
    setUseRandomPasswordConvert(false);
    setGeneratedPasswordConvert('');
  };

  const handleConvertStubConfirm = async () => {
    if (!convertStubUser) return;

    const { email, phone, password, confirmPassword } = convertForm;

    // Validation
    if (!email && !phone) {
      alert('Please provide either an email address or phone number');
      return;
    }

    if (!password) {
      alert('Password is required');
      return;
    }

    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    setConvertingStub(true);
    try {
      const result = await convertStubUser(convertStubUser.userId, convertForm);
      
      if (result.success) {
        // Update user in the list
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user.userId === convertStubUser.userId 
              ? { ...result.user }
              : user
          )
        );
        
        // Show success message with password info if generated
        let successMessage = result.message;
        if (useRandomPasswordConvert && generatedPasswordConvert) {
          successMessage += `\n\nGenerated Password: ${generatedPasswordConvert}\n\nPlease share this password with the user securely.`;
        }
        alert(successMessage);
        
        handleConvertStubCancel();
      } else {
        alert('Failed to convert stub user: ' + result.error);
      }
    } catch (error) {
      console.error('Error converting stub user:', error);
      alert('Failed to convert stub user: ' + error.message);
    } finally {
      setConvertingStub(false);
    }
  };

  const handleMergeStubClick = (user) => {
    setMergeStubUserData(user);
    setSelectedTargetUser('');
    setShowMergeStub(true);
  };

  const handleMergeStubCancel = () => {
    setShowMergeStub(false);
    setMergeStubUserData(null);
    setSelectedTargetUser('');
  };

  const handleMergeStubConfirm = async () => {
    if (!mergeStubUserData || !selectedTargetUser) return;

    setMergingStub(true);
    try {
      const result = await mergeStubUser(mergeStubUserData.userId, selectedTargetUser);
      
      if (result.success) {
        // Remove merged stub user from the list
        setUsers(prevUsers => prevUsers.filter(user => user.userId !== mergeStubUserData.userId));
        
        // Show merge summary
        alert(`Successfully merged stub account!\n\n${result.summary.deletedUser.name} has been merged with ${result.summary.targetUser.name}.\n\nMerged ${result.summary.mergedGameCount} games and ${result.summary.mergedMembershipCount} group memberships.`);
        handleMergeStubCancel();
      } else {
        alert('Failed to merge stub user: ' + result.error);
      }
    } catch (error) {
      console.error('Error merging stub user:', error);
      alert('Failed to merge stub user: ' + error.message);
    } finally {
      setMergingStub(false);
    }
  };

  // Get non-stub users for merge target selection
  const nonStubUsers = users.filter(user => !user.isStub && user.userId !== mergeStubUserData?.userId);

  // Create new user handlers
  const handleCreateUserClick = () => {
    setCreateUserForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      isAdmin: false
    });
    setShowCreateUser(true);
  };

  const handleCreateUserCancel = () => {
    setShowCreateUser(false);
    setCreateUserForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      isAdmin: false
    });
    setUseRandomPassword(false);
    setGeneratedPassword('');
  };

  const generateRandomPassword = () => {
    // Generate a secure random password: 12 characters with mix of letters, numbers, and symbols
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    // Ensure at least one of each type
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // lowercase
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // uppercase  
    password += '0123456789'[Math.floor(Math.random() * 10)]; // number
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)]; // symbol
    
    // Fill remaining 8 characters randomly
    for (let i = 4; i < 12; i++) {
      password += chars[Math.floor(Math.random() * chars.length)];
    }
    
    // Shuffle the password to randomize character positions
    password = password.split('').sort(() => Math.random() - 0.5).join('');
    
    return password;
  };

  const handleGeneratePassword = () => {
    const newPassword = generateRandomPassword();
    setGeneratedPassword(newPassword);
    setCreateUserForm({
      ...createUserForm, 
      password: newPassword,
      confirmPassword: newPassword
    });
    setUseRandomPassword(true);
  };

  const handlePasswordChange = (field, value) => {
    setCreateUserForm({...createUserForm, [field]: value});
    
    // If user manually edits password, turn off random password mode
    if (useRandomPassword && (field === 'password' || field === 'confirmPassword')) {
      setUseRandomPassword(false);
      setGeneratedPassword('');
    }
  };

  // Convert stub password handlers
  const handleGeneratePasswordConvert = () => {
    const newPassword = generateRandomPassword();
    setGeneratedPasswordConvert(newPassword);
    setConvertForm({
      ...convertForm, 
      password: newPassword,
      confirmPassword: newPassword
    });
    setUseRandomPasswordConvert(true);
  };

  const handlePasswordChangeConvert = (field, value) => {
    setConvertForm({...convertForm, [field]: value});
    
    // If user manually edits password, turn off random password mode
    if (useRandomPasswordConvert && (field === 'password' || field === 'confirmPassword')) {
      setUseRandomPasswordConvert(false);
      setGeneratedPasswordConvert('');
    }
  };

  const handleCreateUserConfirm = async () => {
    const { firstName, lastName, email, phone, password, confirmPassword, isAdmin } = createUserForm;

    // Validation
    if (!firstName || !lastName || !password) {
      alert('First name, last name, and password are required');
      return;
    }

    if (!email && !phone) {
      alert('Either email or phone number is required');
      return;
    }

    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    setCreatingUser(true);
    try {
      const userData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        password,
        isAdmin
      };

      const result = await createUser(userData);
      
        if (result.success) {
          // Add new user to the list
          setUsers(prevUsers => [result.user, ...prevUsers]);
          
          // Show success message with password info if generated
          let successMessage = `Successfully created user: ${result.user.firstName} ${result.user.lastName}`;
          if (useRandomPassword && generatedPassword) {
            successMessage += `\n\nGenerated Password: ${generatedPassword}\n\nPlease share this password with the user securely.`;
          }
          alert(successMessage);
          
          handleCreateUserCancel();
        } else {
          // Handle specific error cases
          if (result.statusCode === 409) {
            alert('A user with this email address or phone number already exists.');
          } else {
            alert('Failed to create user: ' + result.error);
          }
        }
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Failed to create user: ' + error.message);
    } finally {
      setCreatingUser(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <Users className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-800">User Management</h2>
      </div>

      {/* Search and Create User */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex gap-4 flex-1">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader className="w-4 h-4 animate-spin" /> : 'Search'}
          </button>
        </form>
        
        {/* Create New User Button */}
        <button
          onClick={handleCreateUserClick}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Create New User
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Users Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">User</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Email</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Phone</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Role</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Created</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                  <Loader className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Loading users...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.userId} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-700 font-medium text-sm">
                          {(user.firstName || '')[0]}{(user.lastName || '')[0]}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </div>
                        {user.isStub && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            Stub Account
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-900">{user.email}</td>
                  <td className="px-4 py-3 text-gray-900">{user.phone || 'N/A'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {user.isAdmin && <Crown className="w-4 h-4 text-yellow-500" />}
                      <span className={`text-sm font-medium ${
                        user.isAdmin ? 'text-yellow-700' : 'text-gray-700'
                      }`}>
                        {user.isAdmin ? 'Admin' : 'User'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-900">{formatDate(user.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {user.isStub ? (
                      // Stub user actions
                      <>
                        <button
                          onClick={() => handleConvertStubClick(user)}
                          className="text-green-600 hover:text-green-800 p-1 rounded-md hover:bg-green-50 transition-colors"
                          title="Convert to full user"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleMergeStubClick(user)}
                          className="text-blue-600 hover:text-blue-800 p-1 rounded-md hover:bg-blue-50 transition-colors"
                          title="Merge with existing user"
                        >
                          <GitMerge className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUserClick(user)}
                          className="text-red-600 hover:text-red-800 p-1 rounded-md hover:bg-red-50 transition-colors"
                          title="Delete stub user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      // Regular user actions
                      <>
                        <button
                          onClick={() => openEditModal(user)}
                          className="text-blue-600 hover:text-blue-800 p-1 rounded-md hover:bg-blue-50 transition-colors"
                          title="Edit user"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleResetPasswordClick(user)}
                          className="text-yellow-600 hover:text-yellow-800 p-1 rounded-md hover:bg-yellow-50 transition-colors"
                          title="Reset password"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUserClick(user)}
                          className="text-red-600 hover:text-red-800 p-1 rounded-md hover:bg-red-50 transition-colors"
                          title="Delete user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {users.length > 0 && (
        <div className="mt-4 text-sm text-gray-600 text-center">
          Showing {users.length} user{users.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Edit User</h3>
              <button
                onClick={closeEditModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.firstName}
                    onChange={(e) => setEditForm(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.lastName}
                    onChange={(e) => setEditForm(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isAdmin"
                    checked={editForm.isAdmin}
                    onChange={(e) => setEditForm(prev => ({ ...prev, isAdmin: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isAdmin" className="ml-2 text-sm font-medium text-gray-700 flex items-center gap-1">
                    <Crown className="w-4 h-4 text-yellow-500" />
                    Admin User
                  </label>
                </div>
              </div>

              {error && (
                <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 justify-end mt-6">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={saving}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-semibold text-red-900">Reset Password</h3>
              <button
                onClick={handleResetPasswordCancel}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <RotateCcw className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Reset Password for:</p>
                  <p className="text-sm text-gray-600">{resetUserName}</p>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> This will generate a new temporary password. 
                  The user will need to change it on their next login.
                </p>
              </div>

              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to reset this user's password? They will receive 
                a temporary password that must be changed on next login.
              </p>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleResetPasswordCancel}
                  disabled={resettingPassword}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetPasswordConfirm}
                  disabled={resettingPassword}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resettingPassword ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <RotateCcw className="w-4 h-4" />
                  )}
                  {resettingPassword ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Temporary Password Display Modal */}
      {showTempPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-semibold text-green-900">Password Reset Complete</h3>
              <button
                onClick={closeTempPasswordModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <RotateCcw className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">New Temporary Password</p>
                  <p className="text-sm text-gray-600">For: {resetUserName}</p>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-green-800">Temporary Password:</label>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setPasswordVisible(!passwordVisible)}
                      className="text-green-600 hover:text-green-800 p-1"
                      title={passwordVisible ? 'Hide password' : 'Show password'}
                    >
                      {passwordVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => copyToClipboard(tempPassword)}
                      className="text-green-600 hover:text-green-800 p-1"
                      title="Copy to clipboard"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="bg-white border border-green-300 rounded px-3 py-2">
                  <code className="text-sm font-mono text-gray-900">
                    {passwordVisible ? tempPassword : '••••••••••••'}
                  </code>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  <strong>Important:</strong> Please securely communicate this password to the user. 
                  They will be required to change it on their next login.
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={closeTempPasswordModal}
                  className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-semibold text-red-900">Delete User</h3>
              <button
                onClick={handleDeleteUserCancel}
                className="text-gray-400 hover:text-gray-600"
                disabled={deletingUser}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Delete User Account</p>
                  <p className="text-sm text-gray-600">{deleteUserName}</p>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-red-800 font-medium mb-2">
                  ⚠️ This action cannot be undone!
                </p>
                <p className="text-sm text-red-700">
                  This will permanently delete the user account and remove them from all groups. 
                  Any games they created or participated in will remain, but their account will be gone forever.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleDeleteUserCancel}
                  disabled={deletingUser}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteUserConfirm}
                  disabled={deletingUser}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingUser ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  {deletingUser ? 'Deleting...' : 'Delete User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Convert Stub User Modal */}
      {showConvertStub && convertStubUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-semibold text-green-900">Convert to Full User</h3>
              <button
                onClick={handleConvertStubCancel}
                className="text-gray-400 hover:text-gray-600"
                disabled={convertingStub}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Convert Stub Account</p>
                  <p className="text-sm text-gray-600">{convertStubUser.firstName} {convertStubUser.lastName}</p>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-green-800 font-medium mb-2">
                  Convert this stub account to a full user account
                </p>
                <p className="text-sm text-green-700">
                  This will allow the user to log in and manage their own profile.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={convertForm.email}
                    onChange={(e) => setConvertForm({...convertForm, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter email address"
                    disabled={convertingStub}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={convertForm.phone}
                    onChange={(e) => setConvertForm({...convertForm, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Phone number"
                    disabled={convertingStub}
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    * At least one of email or phone number is required
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Password *
                    </label>
                    <button
                      type="button"
                      onClick={handleGeneratePasswordConvert}
                      disabled={convertingStub}
                      className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                    >
                      Generate Random Password
                    </button>
                  </div>
                  <input
                    type="password"
                    value={convertForm.password}
                    onChange={(e) => handlePasswordChangeConvert('password', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter password"
                    disabled={convertingStub}
                  />
                  {useRandomPasswordConvert && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ Secure random password generated
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    value={convertForm.confirmPassword}
                    onChange={(e) => handlePasswordChangeConvert('confirmPassword', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Confirm password"
                    disabled={convertingStub}
                  />
                </div>

                {/* Show generated password for admin to copy */}
                {useRandomPasswordConvert && generatedPasswordConvert && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-4 h-4 bg-yellow-100 rounded-full flex items-center justify-center">
                        <span className="text-xs text-yellow-600">!</span>
                      </div>
                      <span className="text-sm font-medium text-yellow-800">Generated Password</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="font-mono text-sm bg-white border rounded p-2 flex-1">
                        {generatedPasswordConvert}
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(generatedPasswordConvert)}
                        className="px-2 py-1 text-xs bg-yellow-600 hover:bg-yellow-700 text-white rounded flex items-center gap-1"
                        title="Copy password to clipboard"
                      >
                        <Copy className="w-3 h-3" />
                        Copy
                      </button>
                    </div>
                    <p className="text-xs text-yellow-700">
                      Save this password! You'll need to share it with the user securely.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={convertForm.firstName}
                      onChange={(e) => setConvertForm({...convertForm, firstName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="First name"
                      disabled={convertingStub}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={convertForm.lastName}
                      onChange={(e) => setConvertForm({...convertForm, lastName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Last name"
                      disabled={convertingStub}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={convertForm.phone}
                    onChange={(e) => setConvertForm({...convertForm, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Phone number"
                    disabled={convertingStub}
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={handleConvertStubCancel}
                  disabled={convertingStub}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConvertStubConfirm}
                  disabled={convertingStub}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {convertingStub ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  {convertingStub ? 'Converting...' : 'Convert to Full User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Merge Stub User Modal */}
      {showMergeStub && mergeStubUserData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-semibold text-blue-900">Merge Stub User</h3>
              <button
                onClick={handleMergeStubCancel}
                className="text-gray-400 hover:text-gray-600"
                disabled={mergingStub}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <GitMerge className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Merge Stub Account</p>
                  <p className="text-sm text-gray-600">{mergeStubUserData.firstName} {mergeStubUserData.lastName}</p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800 font-medium mb-2">
                  ⚠️ This will permanently merge the stub account
                </p>
                <p className="text-sm text-blue-700">
                  All games and group memberships will be transferred to the selected user. 
                  The stub account will be deleted permanently.
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select target user to merge with:
                </label>
                <select
                  value={selectedTargetUser}
                  onChange={(e) => setSelectedTargetUser(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={mergingStub}
                >
                  <option value="">-- Select User --</option>
                  {nonStubUsers.map(user => (
                    <option key={user.userId} value={user.userId}>
                      {user.firstName} {user.lastName} ({user.email})
                    </option>
                  ))}
                </select>
                {nonStubUsers.length === 0 && (
                  <p className="text-sm text-gray-500 mt-2">
                    No full user accounts available for merging.
                  </p>
                )}
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleMergeStubCancel}
                  disabled={mergingStub}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMergeStubConfirm}
                  disabled={mergingStub || !selectedTargetUser}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {mergingStub ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <GitMerge className="w-4 h-4" />
                  )}
                  {mergingStub ? 'Merging...' : 'Merge Users'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create New User Modal */}
      {showCreateUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-semibold text-green-900">Create New User</h3>
              <button
                onClick={handleCreateUserCancel}
                className="text-gray-400 hover:text-gray-600"
                disabled={creatingUser}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Create New Account</p>
                  <p className="text-sm text-gray-600">Create a new user account with login credentials</p>
                </div>
              </div>

              <form className="space-y-4">
                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={createUserForm.firstName}
                      onChange={(e) => setCreateUserForm({...createUserForm, firstName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      disabled={creatingUser}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={createUserForm.lastName}
                      onChange={(e) => setCreateUserForm({...createUserForm, lastName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      disabled={creatingUser}
                      required
                    />
                  </div>
                </div>

                {/* Contact Fields */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={createUserForm.email}
                    onChange={(e) => setCreateUserForm({...createUserForm, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    disabled={creatingUser}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={createUserForm.phone}
                    onChange={(e) => setCreateUserForm({...createUserForm, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    disabled={creatingUser}
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    * At least one of email or phone number is required
                  </p>
                </div>

                {/* Password Fields */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Password *
                    </label>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      disabled={creatingUser}
                      className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                    >
                      Generate Random Password
                    </button>
                  </div>
                  <input
                    type="password"
                    value={createUserForm.password}
                    onChange={(e) => handlePasswordChange('password', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    disabled={creatingUser}
                    required
                    minLength={6}
                  />
                  {useRandomPassword && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ Secure random password generated
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    value={createUserForm.confirmPassword}
                    onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    disabled={creatingUser}
                    required
                    minLength={6}
                  />
                </div>

                {/* Show generated password for admin to copy */}
                {useRandomPassword && generatedPassword && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-4 h-4 bg-yellow-100 rounded-full flex items-center justify-center">
                        <span className="text-xs text-yellow-600">!</span>
                      </div>
                      <span className="text-sm font-medium text-yellow-800">Generated Password</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="font-mono text-sm bg-white border rounded p-2 flex-1">
                        {generatedPassword}
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(generatedPassword)}
                        className="px-2 py-1 text-xs bg-yellow-600 hover:bg-yellow-700 text-white rounded flex items-center gap-1"
                        title="Copy password to clipboard"
                      >
                        <Copy className="w-3 h-3" />
                        Copy
                      </button>
                    </div>
                    <p className="text-xs text-yellow-700">
                      Save this password! You'll need to share it with the user securely.
                    </p>
                  </div>
                )}

                {/* Admin Checkbox */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isAdmin"
                    checked={createUserForm.isAdmin}
                    onChange={(e) => setCreateUserForm({...createUserForm, isAdmin: e.target.checked})}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    disabled={creatingUser}
                  />
                  <label htmlFor="isAdmin" className="ml-2 block text-sm text-gray-900">
                    Admin user (can manage all users and groups)
                  </label>
                </div>
              </form>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t">
              <button
                onClick={handleCreateUserCancel}
                disabled={creatingUser}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateUserConfirm}
                disabled={creatingUser}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingUser ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                {creatingUser ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
