import React, { useState, useRef, useEffect } from 'react';
import { User, Settings, LogOut, ChevronDown, Users, Calendar, Clock, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

const UserDropdown = ({ onProfileClick, onUserManagementClick, onGroupMembersClick, onRSVPClick, selectedGroup, upcomingGames, onRSVPChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { currentUser, handleUserLogout, isAdmin } = useAuth();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Get user display name
  const getDisplayName = () => {
    if (!currentUser) return 'User';
    
    if (currentUser.firstName && currentUser.lastName) {
      return `${currentUser.firstName} ${currentUser.lastName}`;
    } else if (currentUser.firstName) {
      return currentUser.firstName;
    } else if (currentUser.lastName) {
      return currentUser.lastName;
    } else if (currentUser.email) {
      return currentUser.email.split('@')[0];
    } else {
      return 'User';
    }
  };

  // Get user initials for avatar
  const getInitials = () => {
    const displayName = getDisplayName();
    if (displayName === 'User') return 'U';
    
    const words = displayName.split(' ');
    if (words.length >= 2) {
      return `${words[0][0]}${words[1][0]}`.toUpperCase();
    } else {
      return displayName.substring(0, 2).toUpperCase();
    }
  };

  const handleProfileClick = () => {
    setIsOpen(false);
    if (onProfileClick) {
      onProfileClick();
    }
  };

  const handleUserManagementClick = () => {
    setIsOpen(false);
    if (onUserManagementClick) {
      onUserManagementClick();
    }
  };

  const handleGroupMembersClick = () => {
    setIsOpen(false);
    if (onGroupMembersClick) {
      onGroupMembersClick();
    }
  };

  const handleRSVPClick = () => {
    setIsOpen(false);
    if (onRSVPClick) {
      onRSVPClick();
    }
  };

  const handleLogout = () => {
    setIsOpen(false);
    handleUserLogout();
  };

  // Check if user can manage group members
  const canManageGroup = selectedGroup && (selectedGroup.userRole === 'owner' || isAdmin);

  // Helper to format game time for display
  const formatGameTime = (game) => {
    if (!game.date) return '';
    
    if (game.time) {
      // Convert UTC time to local time for display
      const utcDateTime = new Date(`${game.date}T${game.time}:00.000Z`);
      return utcDateTime.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
    
    return new Date(game.date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    });
  };

  // Handle RSVP change
  const handleRSVPChange = (gameId, newStatus) => {
    if (onRSVPChange) {
      onRSVPChange(gameId, newStatus);
    }
  };

  // Get user's RSVP status for a game
  const getUserRSVP = (game) => {
    const userResult = game.results?.find(r => r.userId === currentUser?.userId);
    return userResult?.rsvpStatus || 'pending';
  };

  if (!currentUser) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* User Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors"
      >
        {/* Avatar */}
        <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
          {getInitials()}
        </div>
        
        {/* Name and chevron */}
        <div className="hidden sm:flex items-center gap-1">
          <span className="text-sm font-medium text-gray-700 max-w-32 truncate">
            {getDisplayName()}
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
        
        {/* Mobile: just chevron */}
        <div className="sm:hidden">
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          {/* User Info Header */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900 truncate">
              {getDisplayName()}
            </p>
            {currentUser.email && (
              <p className="text-sm text-gray-500 truncate">
                {currentUser.email}
              </p>
            )}
            {currentUser.isAdmin && (
              <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                Admin
              </span>
            )}
          </div>

          {/* Upcoming Games Section */}
          {upcomingGames && upcomingGames.length > 0 && (
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <h4 className="text-sm font-medium text-gray-900">Upcoming Games</h4>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {upcomingGames.slice(0, 3).map((game) => {
                  const userRSVP = getUserRSVP(game);
                  return (
                    <div key={game.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                            <Clock className="w-3 h-3" />
                            {formatGameTime(game)}
                          </div>
                          <p className="text-sm font-medium text-gray-900 truncate">
                            Poker Game
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">RSVP:</span>
                        <select
                          value={userRSVP}
                          onChange={(e) => handleRSVPChange(game.id, e.target.value)}
                          className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                          <option value="pending">Pending</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
                {upcomingGames.length > 3 && (
                  <div className="text-center">
                    <span className="text-xs text-gray-500">
                      +{upcomingGames.length - 3} more games
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Menu Items */}
          <div className="py-1">
            <button
              onClick={handleProfileClick}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Settings className="w-4 h-4" />
              My Profile
            </button>

            <button
              onClick={handleRSVPClick}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Mail className="w-4 h-4" />
              My RSVPs
            </button>

            {canManageGroup && (
              <button
                onClick={handleGroupMembersClick}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <Users className="w-4 h-4" />
                Group Members
              </button>
            )}
            
            {isAdmin && (
              <button
                onClick={handleUserManagementClick}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <Settings className="w-4 h-4" />
                User Management
              </button>
            )}
            
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDropdown;
