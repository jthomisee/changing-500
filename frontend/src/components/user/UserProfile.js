import React, { useState } from 'react';
import { User, Edit, Save, Loader, Key, Shield, Bell, Mail, Phone, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { updateMyProfile, changePassword } from '../../services/profileService';

const UserProfile = () => {
  const { currentUser, refreshCurrentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [profileForm, setProfileForm] = useState({
    firstName: currentUser?.firstName || '',
    lastName: currentUser?.lastName || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    timezone: currentUser?.timezone || 'America/New_York'
  });

  // Notification preferences state
  const [isEditingNotifications, setIsEditingNotifications] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [notificationError, setNotificationError] = useState('');
  const [notificationSuccess, setNotificationSuccess] = useState('');
  
  const [notificationForm, setNotificationForm] = useState({
    gameInvitations: {
      email: currentUser?.notificationPreferences?.gameInvitations?.email || false,
      sms: currentUser?.notificationPreferences?.gameInvitations?.sms || false
    },
    gameResults: {
      email: currentUser?.notificationPreferences?.gameResults?.email || false,
      sms: currentUser?.notificationPreferences?.gameResults?.sms || false
    }
  });

  // Password change state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleEditClick = () => {
    setProfileForm({
      firstName: currentUser?.firstName || '',
      lastName: currentUser?.lastName || '',
      email: currentUser?.email || '',
      phone: currentUser?.phone || '',
      timezone: currentUser?.timezone || 'America/New_York'
    });
    setIsEditing(true);
    setError('');
    setSuccess('');
  };

  const handleNotificationEditClick = () => {
    setNotificationForm({
      gameInvitations: {
        email: currentUser?.notificationPreferences?.gameInvitations?.email || false,
        sms: currentUser?.notificationPreferences?.gameInvitations?.sms || false
      },
      gameResults: {
        email: currentUser?.notificationPreferences?.gameResults?.email || false,
        sms: currentUser?.notificationPreferences?.gameResults?.sms || false
      }
    });
    setIsEditingNotifications(true);
    setNotificationError('');
    setNotificationSuccess('');
  };

  const handleNotificationCancel = () => {
    setIsEditingNotifications(false);
    setNotificationError('');
    setNotificationSuccess('');
    setNotificationForm({
      gameInvitations: {
        email: currentUser?.notificationPreferences?.gameInvitations?.email || false,
        sms: currentUser?.notificationPreferences?.gameInvitations?.sms || false
      },
      gameResults: {
        email: currentUser?.notificationPreferences?.gameResults?.email || false,
        sms: currentUser?.notificationPreferences?.gameResults?.sms || false
      }
    });
  };

  const handleNotificationSave = async (e) => {
    e.preventDefault();
    
    setSavingNotifications(true);
    setNotificationError('');
    setNotificationSuccess('');

    try {
      const result = await updateMyProfile({
        notificationPreferences: notificationForm
      });
      
      if (result.success) {
        refreshCurrentUser(result.user);
        setNotificationSuccess('Notification preferences updated successfully!');
        setIsEditingNotifications(false);
      } else {
        setNotificationError(result.error);
      }
    } catch (err) {
      setNotificationError('Failed to update notification preferences');
    } finally {
      setSavingNotifications(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError('');
    setSuccess('');
    setProfileForm({
      firstName: currentUser?.firstName || '',
      lastName: currentUser?.lastName || '',
      email: currentUser?.email || '',
      phone: currentUser?.phone || '',
      timezone: currentUser?.timezone || 'America/New_York'
    });
  };

  const handlePasswordChangeClick = () => {
    setIsChangingPassword(true);
    setPasswordError('');
    setPasswordSuccess('');
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  };

  const handlePasswordCancel = () => {
    setIsChangingPassword(false);
    setPasswordError('');
    setPasswordSuccess('');
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  };

  const validatePassword = (password) => {
    if (!password || password.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    return null;
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All password fields are required');
      return;
    }

    const passwordValidation = validatePassword(newPassword);
    if (passwordValidation) {
      setPasswordError(passwordValidation);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match');
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError('New password must be different from current password');
      return;
    }

    setChangingPassword(true);
    setPasswordError('');
    setPasswordSuccess('');

    try {
      const result = await changePassword({
        currentPassword,
        newPassword
      });

      if (result.success) {
        setPasswordSuccess('Password changed successfully!');
        setIsChangingPassword(false);
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        setPasswordError(result.error);
      }
    } catch (err) {
      setPasswordError('Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    if (!profileForm.firstName || !profileForm.lastName || !profileForm.email) {
      setError('First name, last name, and email are required');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const result = await updateMyProfile(profileForm);
      if (result.success) {
        // Update the current user in context with fresh data
        refreshCurrentUser(result.user);
        setSuccess('Profile updated successfully!');
        setIsEditing(false);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  if (!currentUser) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
        <p className="text-gray-500">Please log in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <User className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-800">My Profile</h2>
        </div>
        
        {!isEditing && (
          <button
            onClick={handleEditClick}
            className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Edit className="w-4 h-4" />
            Edit Profile
          </button>
        )}
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {isEditing ? (
        /* Edit Form */
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name *
              </label>
              <input
                type="text"
                required
                value={profileForm.firstName}
                onChange={(e) => setProfileForm(prev => ({ ...prev, firstName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name *
              </label>
              <input
                type="text"
                required
                value={profileForm.lastName}
                onChange={(e) => setProfileForm(prev => ({ ...prev, lastName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={profileForm.email}
                onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={profileForm.phone}
                onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Timezone
              </label>
              <select
                value={profileForm.timezone}
                onChange={(e) => setProfileForm(prev => ({ ...prev, timezone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="America/Phoenix">Arizona Time (MST)</option>
                <option value="America/Anchorage">Alaska Time (AKST)</option>
                <option value="Pacific/Honolulu">Hawaii Time (HST)</option>
                <option value="UTC">UTC (Universal Time)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                This will be used for displaying game times and sending notifications at appropriate times.
              </p>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="px-6 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 border border-gray-300 rounded-lg hover:bg-gray-50"
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
      ) : (
        /* View Mode */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-500 mb-1">First Name</label>
              <p className="text-lg text-gray-900 break-words">{currentUser.firstName || 'Not set'}</p>
            </div>

            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-500 mb-1">Last Name</label>
              <p className="text-lg text-gray-900 break-words">{currentUser.lastName || 'Not set'}</p>
            </div>

            <div className="min-w-0 md:col-span-2">
              <label className="block text-sm font-medium text-gray-500 mb-1">Email Address</label>
              <p className="text-lg text-gray-900 break-all">{currentUser.email}</p>
            </div>

            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-500 mb-1">Phone Number</label>
              <p className="text-lg text-gray-900 break-words">{currentUser.phone || 'Not set'}</p>
            </div>

            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-500 mb-1">Account Type</label>
              <p className="text-lg text-gray-900 flex items-center gap-2">
                {currentUser.isAdmin ? (
                  <>
                    <span className="text-yellow-600">Admin</span>
                    <span className="text-yellow-500">👑</span>
                  </>
                ) : (
                  <span className="text-gray-700">User</span>
                )}
              </p>
            </div>

            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-500 mb-1">Member Since</label>
              <p className="text-lg text-gray-900 break-words">{formatDate(currentUser.createdAt)}</p>
            </div>

            <div className="min-w-0 md:col-span-2">
              <label className="block text-sm font-medium text-gray-500 mb-1">
                <Clock className="w-4 h-4 inline mr-1" />
                Timezone
              </label>
              <p className="text-lg text-gray-900 break-words">
                {currentUser.timezone ? (() => {
                  const timezoneMap = {
                    'America/New_York': 'Eastern Time (ET)',
                    'America/Chicago': 'Central Time (CT)',
                    'America/Denver': 'Mountain Time (MT)',
                    'America/Los_Angeles': 'Pacific Time (PT)',
                    'America/Phoenix': 'Arizona Time (MST)',
                    'America/Anchorage': 'Alaska Time (AKST)',
                    'Pacific/Honolulu': 'Hawaii Time (HST)',
                    'UTC': 'UTC (Universal Time)'
                  };
                  return timezoneMap[currentUser.timezone] || currentUser.timezone;
                })() : 'Eastern Time (ET)'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Password Change Section */}
      <div className="mt-8 border-t border-gray-200 pt-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-red-600" />
            <h3 className="text-xl font-bold text-gray-800">Password & Security</h3>
          </div>
          
          {!isChangingPassword && (
            <button
              onClick={handlePasswordChangeClick}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Key className="w-4 h-4" />
              Change Password
            </button>
          )}
        </div>

        {/* Password Success/Error Messages */}
        {passwordSuccess && (
          <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {passwordSuccess}
          </div>
        )}

        {passwordError && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {passwordError}
          </div>
        )}

        {isChangingPassword ? (
          /* Password Change Form */
          <form onSubmit={handlePasswordChange} className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-yellow-600" />
                <p className="text-sm text-yellow-800">
                  <strong>Security Requirements:</strong>
                </p>
              </div>
              <ul className="text-sm text-yellow-700 mt-2 ml-7 list-disc">
                <li>Password must be at least 6 characters long</li>
                <li>You must provide your current password for verification</li>
                <li>New password must be different from your current password</li>
              </ul>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Password *
                </label>
                <input
                  type="password"
                  required
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Enter your current password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password *
                </label>
                <input
                  type="password"
                  required
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Enter your new password (min 6 characters)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  required
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Confirm your new password"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <button
                type="button"
                onClick={handlePasswordCancel}
                disabled={changingPassword}
                className="px-6 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={changingPassword}
                className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {changingPassword ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Key className="w-4 h-4" />
                )}
                {changingPassword ? 'Changing Password...' : 'Change Password'}
              </button>
            </div>
          </form>
        ) : (
          /* Password Section - View Mode */
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Password</label>
              <p className="text-lg text-gray-900">••••••••••••</p>
              <p className="text-sm text-gray-500 mt-1">Last updated: {formatDate(currentUser?.updatedAt)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Notification Preferences Section */}
      <div className="mt-8 border-t border-gray-200 pt-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-green-600" />
            <h3 className="text-xl font-bold text-gray-800">Notification Preferences</h3>
          </div>
          
          {!isEditingNotifications && (
            <button
              onClick={handleNotificationEditClick}
              className="flex items-center gap-2 px-4 py-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
            >
              <Edit className="w-4 h-4" />
              Edit Preferences
            </button>
          )}
        </div>

        {/* Notification Success/Error Messages */}
        {notificationSuccess && (
          <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {notificationSuccess}
          </div>
        )}

        {notificationError && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {notificationError}
          </div>
        )}

        {isEditingNotifications ? (
          /* Notification Edit Form */
          <form onSubmit={handleNotificationSave} className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600" />
                <p className="text-sm text-blue-800">
                  <strong>Notification Settings:</strong>
                </p>
              </div>
              <ul className="text-sm text-blue-700 mt-2 ml-7 list-disc">
                <li>Game Invitations: When you're invited to a game (RSVP pending or yes)</li>
                <li>Game Results: When a game you participated in is marked as completed</li>
                <li>SMS notifications require a valid phone number in your profile</li>
              </ul>
            </div>

            <div className="space-y-6">
              {/* Game Invitations */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-blue-600" />
                  Game Invitations
                </h4>
                <p className="text-sm text-gray-600 mb-4">
                  Receive notifications when you're invited to a scheduled game.
                </p>
                
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={notificationForm.gameInvitations.email}
                      onChange={(e) => setNotificationForm(prev => ({
                        ...prev,
                        gameInvitations: {
                          ...prev.gameInvitations,
                          email: e.target.checked
                        }
                      }))}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">Email notifications</span>
                  </label>
                  
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={notificationForm.gameInvitations.sms}
                      onChange={(e) => setNotificationForm(prev => ({
                        ...prev,
                        gameInvitations: {
                          ...prev.gameInvitations,
                          sms: e.target.checked
                        }
                      }))}
                      disabled={!currentUser?.phone}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    />
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">
                      SMS notifications {!currentUser?.phone && '(requires phone number)'}
                    </span>
                  </label>
                  {(notificationForm.gameInvitations.sms || notificationForm.gameResults.sms) && (
                    <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mt-3">
                      <p className="text-xs text-amber-800">
                        <strong>SMS Terms:</strong> By enabling SMS notifications, you consent to receive text messages from Changing 500.
                        Message and data rates may apply. Message frequency: ~1-3 messages per week.
                        Reply STOP to opt-out or update preferences here. See our{' '}
                        <a href="/terms" className="underline hover:text-amber-900" target="_blank" rel="noopener">Terms</a> and{' '}
                        <a href="/privacy" className="underline hover:text-amber-900" target="_blank" rel="noopener">Privacy Policy</a>.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Game Results */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-600" />
                  Game Results
                </h4>
                <p className="text-sm text-gray-600 mb-4">
                  Receive notifications when games you participated in are completed with results.
                </p>
                
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={notificationForm.gameResults.email}
                      onChange={(e) => setNotificationForm(prev => ({
                        ...prev,
                        gameResults: {
                          ...prev.gameResults,
                          email: e.target.checked
                        }
                      }))}
                      className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                    />
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">Email notifications</span>
                  </label>
                  
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={notificationForm.gameResults.sms}
                      onChange={(e) => setNotificationForm(prev => ({
                        ...prev,
                        gameResults: {
                          ...prev.gameResults,
                          sms: e.target.checked
                        }
                      }))}
                      disabled={!currentUser?.phone}
                      className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                    />
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">
                      SMS notifications {!currentUser?.phone && '(requires phone number)'}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <button
                type="button"
                onClick={handleNotificationCancel}
                disabled={savingNotifications}
                className="px-6 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingNotifications}
                className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingNotifications ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {savingNotifications ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </form>
        ) : (
          /* Notification Preferences - View Mode */
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Game Invitations View */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-lg font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-blue-600" />
                  Game Invitations
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">Email: </span>
                    <span className={`text-sm font-medium ${
                      currentUser?.notificationPreferences?.gameInvitations?.email ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {currentUser?.notificationPreferences?.gameInvitations?.email ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">SMS: </span>
                    <span className={`text-sm font-medium ${
                      currentUser?.notificationPreferences?.gameInvitations?.sms ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {currentUser?.notificationPreferences?.gameInvitations?.sms ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Game Results View */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-lg font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-600" />
                  Game Results
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">Email: </span>
                    <span className={`text-sm font-medium ${
                      currentUser?.notificationPreferences?.gameResults?.email ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {currentUser?.notificationPreferences?.gameResults?.email ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">SMS: </span>
                    <span className={`text-sm font-medium ${
                      currentUser?.notificationPreferences?.gameResults?.sms ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {currentUser?.notificationPreferences?.gameResults?.sms ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
