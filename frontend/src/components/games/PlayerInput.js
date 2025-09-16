import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X } from 'lucide-react';

const PlayerInput = ({ 
  result, 
  index, 
  groupUsers = [], 
  allResults = [],
  onPlayerChange, 
  onAddGroupUser,
  loading = false
}) => {
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [newPlayerForm, setNewPlayerForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });
  const [creatingPlayer, setCreatingPlayer] = useState(false);
  const [error, setError] = useState('');

  const handlePlayerSelect = (e) => {
    const selectedUserId = e.target.value;
    
    if (selectedUserId === 'add-new') {
      setShowAddPlayer(true);
      return;
    }
    
    if (selectedUserId === '') {
      onPlayerChange(index, 'userId', '');
      return;
    }

    // Just store the userId - no need for player name
    onPlayerChange(index, 'userId', selectedUserId);
  };

  const handleAddPlayerSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling to parent form
    
    if (!newPlayerForm.firstName.trim() && !newPlayerForm.lastName.trim()) {
      setError('Please enter at least a first name or last name');
      return;
    }

    if (!newPlayerForm.email.trim() && !newPlayerForm.phone.trim()) {
      setError('Please provide either an email address or phone number');
      return;
    }

    setError('');
    setCreatingPlayer(true);
    try {
      const playerData = {
        firstName: newPlayerForm.firstName.trim(),
        lastName: newPlayerForm.lastName.trim(),
        email: newPlayerForm.email.trim() || null,
        phone: newPlayerForm.phone.trim() || null
      };
      
      const result = await onAddGroupUser(playerData);

      if (result.success) {
        // Select the user by userId (whether found existing or newly created)        
        onPlayerChange(index, 'userId', result.user.userId);
        
        // Reset form and close modal
        setNewPlayerForm({ firstName: '', lastName: '', email: '', phone: '' });
        setShowAddPlayer(false);
        setError('');
        
        // Show success message based on what happened
        if (result.isExistingUser) {
          console.log('Successfully added existing user to game');
        } else if (result.isFullAccount) {
          console.log('Successfully created account and added to game');
        }
      } else {
        console.error('Failed to create/find player:', result.error);
        setError('Failed to add player: ' + result.error);
      }
    } catch (error) {
      console.error('Error creating/finding player:', error);
      setError('Failed to add player: ' + error.message);
    } finally {
      setCreatingPlayer(false);
    }
  };

  const handleAddPlayerCancel = () => {
    setNewPlayerForm({ firstName: '', lastName: '', email: '', phone: '' });
    setShowAddPlayer(false);
    setError('');
  };

  // Get current selected user ID
  const currentUserId = result.userId || '';

  // Get all selected user IDs from other results (excluding current index)
  const selectedUserIds = allResults
    .filter((_, resultIndex) => resultIndex !== index)
    .map(r => r.userId)
    .filter(Boolean);

  // Filter out already selected users and sort alphabetically
  const availableUsers = groupUsers
    .filter(user => !selectedUserIds.includes(user.userId))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  return (
    <div className="relative">
      <select
        value={currentUserId}
        onChange={handlePlayerSelect}
        className="w-full border rounded px-4 py-3 text-base min-w-0"
        required
        disabled={loading}
      >
        <option value="">-- Select Player --</option>
        {availableUsers.map((user) => (
          <option key={user.userId} value={user.userId}>
            {user.displayName}
            
          </option>
        ))}
        <option value="add-new">+ Add New Player</option>
      </select>

      {/* Add New Player Modal */}
      {showAddPlayer && createPortal(
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => e.stopPropagation()} // Prevent any click events from bubbling
        >
          <div 
            className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()} // Prevent modal content clicks from bubbling
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Add New Player</h3>
              <button
                type="button"
                onClick={handleAddPlayerCancel}
                disabled={creatingPlayer}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPlayerSubmit} onClick={(e) => e.stopPropagation()}>
              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                  {error}
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={newPlayerForm.firstName}
                    onChange={(e) => setNewPlayerForm({...newPlayerForm, firstName: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="Enter first name"
                    disabled={creatingPlayer}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={newPlayerForm.lastName}
                    onChange={(e) => setNewPlayerForm({...newPlayerForm, lastName: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="Enter last name"
                    disabled={creatingPlayer}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newPlayerForm.email}
                    onChange={(e) => setNewPlayerForm({...newPlayerForm, email: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="Enter email address"
                    disabled={creatingPlayer}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={newPlayerForm.phone}
                    onChange={(e) => setNewPlayerForm({...newPlayerForm, phone: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="Enter phone number"
                    disabled={creatingPlayer}
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>User creation:</strong>
                    <br />• Requires email or phone
                    <br />• If email/phone exists → adds existing user to group
                    <br />• If new → creates account with a secure random password
                  </p>
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleAddPlayerCancel();
                  }}
                  disabled={creatingPlayer}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    creatingPlayer || 
                    (!newPlayerForm.firstName.trim() && !newPlayerForm.lastName.trim()) ||
                    (!newPlayerForm.email.trim() && !newPlayerForm.phone.trim())
                  }
                  onClick={(e) => e.stopPropagation()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingPlayer ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {creatingPlayer ? 'Creating...' : 'Create Player'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default PlayerInput;
