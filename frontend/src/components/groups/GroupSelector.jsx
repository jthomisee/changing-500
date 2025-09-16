import React, { useState, useRef, useEffect } from 'react';
import { Users, ChevronDown, Plus, Loader } from 'lucide-react';

const GroupSelector = ({ 
  groups, 
  selectedGroup, 
  onSelectGroup, 
  onCreateGroup,
  loading,
  error,
  isAdmin 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

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

  const handleGroupSelect = (group) => {
    setIsOpen(false);
    onSelectGroup(group);
  };

  const handleCreateGroupClick = () => {
    setIsOpen(false);
    onCreateGroup();
  };

  if (!groups || groups.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleCreateGroupClick}
          className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Create Group</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Group Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors min-w-0"
      >
        <Users className="w-4 h-4 text-gray-600 flex-shrink-0" />
        
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-sm font-medium text-gray-700 truncate max-w-32">
            {selectedGroup ? selectedGroup.name : 'Select Group'}
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 max-h-80 overflow-y-auto">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">
              {isAdmin ? 'Select Group (Admin Access)' : 'Select Group'}
            </p>
            {isAdmin && (
              <p className="text-xs text-blue-600 mt-1">
                🔑 You can view all groups, even those you're not a member of
              </p>
            )}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="px-4 py-3 flex items-center gap-2 text-sm text-gray-500">
              <Loader className="w-4 h-4 animate-spin" />
              Loading groups...
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Group List */}
          {!loading && !error && (
            <>
              <div className="py-1">
                {/* Default option */}
                <button
                  onClick={() => handleGroupSelect(null)}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${
                    !selectedGroup ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  }`}
                >
                  <div className="w-4 h-4" /> {/* Spacer for icon */}
                  Choose a group...
                </button>

                {/* Group Options */}
                {groups.map((group) => (
                  <button
                    key={group.groupId}
                    onClick={() => handleGroupSelect(group)}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${
                      selectedGroup?.groupId === group.groupId ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    <Users className="w-4 h-4 flex-shrink-0" />
                    <div className="flex-1 text-left min-w-0">
                      <div className="font-medium truncate">{group.name}</div>
                      <div className="text-xs text-gray-500">
                        {group.memberCount || 0} members
                        {isAdmin && group.userRole === 'admin-view' && ' • Admin View'}
                        {isAdmin && group.userRole === 'owner' && ' • Owner'}
                      </div>
                    </div>
                    {selectedGroup?.groupId === group.groupId && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              {/* Create Group Option */}
              <div className="border-t border-gray-100 py-1">
                <button
                  onClick={handleCreateGroupClick}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-green-700 hover:bg-green-50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create New Group
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default GroupSelector;
