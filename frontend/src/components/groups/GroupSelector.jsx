import React, { useState, useRef, useEffect } from 'react';
import { Users, ChevronDown, Plus, Loader, Search } from 'lucide-react';

const GroupSelector = ({
  groups,
  selectedGroup,
  onSelectGroup,
  onCreateGroup,
  loading,
  error,
  isAdmin,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Focus search input when dropdown opens and there are many groups
  useEffect(() => {
    if (isOpen && groups && groups.length > 5 && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, groups]);

  // Filter groups based on search term
  const filteredGroups =
    groups?.filter((group) =>
      group.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  const showSearch = groups && groups.length > 5;

  const handleGroupSelect = (group) => {
    setIsOpen(false);
    setSearchTerm('');
    onSelectGroup(group);
  };

  const handleCreateGroupClick = () => {
    setIsOpen(false);
    setSearchTerm('');
    onCreateGroup();
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  if (!groups || groups.length === 0) {
    return null;
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
          <ChevronDown
            className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          />
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

          {/* Search Input (only show if more than 5 groups) */}
          {showSearch && (
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search groups..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="px-4 py-3 flex items-center gap-2 text-sm text-gray-500">
              <Loader className="w-4 h-4 animate-spin" />
              Loading groups...
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="px-4 py-3 text-sm text-red-600">{error}</div>
          )}

          {/* Group List */}
          {!loading && !error && (
            <>
              <div className="py-1">
                {/* Default option */}
                <button
                  onClick={() => handleGroupSelect(null)}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${
                    !selectedGroup
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700'
                  }`}
                >
                  <div className="w-4 h-4" /> {/* Spacer for icon */}
                  Choose a group...
                </button>

                {/* Group Options */}
                {filteredGroups.length > 0 ? (
                  filteredGroups.map((group) => (
                    <button
                      key={group.groupId}
                      onClick={() => handleGroupSelect(group)}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${
                        selectedGroup?.groupId === group.groupId
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700'
                      }`}
                    >
                      <Users className="w-4 h-4 flex-shrink-0" />
                      <div className="flex-1 text-left min-w-0">
                        <div className="font-medium truncate">{group.name}</div>
                        <div className="text-xs text-gray-500">
                          {group.memberCount || 0} members
                          {isAdmin &&
                            group.userRole === 'admin-view' &&
                            ' • Admin View'}
                          {isAdmin && group.userRole === 'owner' && ' • Owner'}
                        </div>
                      </div>
                      {selectedGroup?.groupId === group.groupId && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
                      )}
                    </button>
                  ))
                ) : showSearch && searchTerm ? (
                  <div className="px-4 py-3 text-sm text-gray-500 text-center">
                    No groups found matching "{searchTerm}"
                  </div>
                ) : null}
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
