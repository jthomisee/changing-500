import React from 'react';

const PlayerInput = ({ 
  result, 
  index, 
  availableUsers, 
  isAuthenticated,
  onPlayerChange, 
  onUserSearch 
}) => {
  const handleInputChange = async (e) => {
    const value = e.target.value;
    onPlayerChange(index, 'player', value);
    
    // Search users when typing (if authenticated)
    if (isAuthenticated && value.length > 1) {
      await onUserSearch(value);
    } else {
      onUserSearch(''); // Clear results
    }
  };

  const handleUserSelect = (user) => {
    onPlayerChange(index, 'player', user.displayName);
    onUserSearch(''); // Clear results
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={result.player}
        onChange={handleInputChange}
        className="w-full border rounded px-2 py-1 text-sm"
        placeholder={isAuthenticated ? "Type name or select user" : "Player name"}
        required
      />
      {/* User suggestions dropdown */}
      {availableUsers.length > 0 && result.player.length > 1 && (
        <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-b max-h-32 overflow-y-auto z-10">
          {availableUsers.map((user) => (
            <button
              key={user.userId}
              type="button"
              onClick={() => handleUserSelect(user)}
              className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm border-b border-gray-100 last:border-b-0"
            >
              <div className="font-medium">{user.displayName}</div>
              {user.email && <div className="text-xs text-gray-500">{user.email}</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default PlayerInput;
