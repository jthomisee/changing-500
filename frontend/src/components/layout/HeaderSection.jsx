import React from 'react';
import { Trophy, X } from 'lucide-react';
import AuthButtons from '../auth/AuthButtons.jsx';
import UserDropdown from '../user/UserDropdown.jsx';
import GroupSelector from '../groups/GroupSelector.jsx';

const HeaderSection = ({
  isMobile,
  currentUser,
  isAdmin,
  navigate,
  groups,
  selectedGroup,
  loadingGroups,
  groupError,
  selectGroup,
  setShowCreateGroup,
  upcomingGames,
  onRSVPChange,
  gamesError,
  setGamesError,
  setShowUserAuth
}) => {
  return (
    <div className="mb-8">
      {/* Top Header Bar */}
      {isMobile ? (
        // Mobile: Vertical layout
        <div className="mb-4">
          {/* App Title - Full width on mobile */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer w-full justify-center mb-4"
          >
            <Trophy className="w-8 h-8 text-yellow-500 flex-shrink-0" />
            <h1 className="text-2xl font-bold text-gray-800">Changing 500</h1>
          </button>

          {/* User Actions - Below title, stacked vertically */}
          <div className="flex flex-col items-center gap-3">
            {currentUser ? (
              <UserDropdown
                onProfileClick={() => navigate('/profile')}
                onUserManagementClick={() => navigate('/admin/users')}
                onGroupMembersClick={() => navigate('/groups')}
                onRSVPClick={() => navigate('/rsvp')}
                selectedGroup={selectedGroup}
                upcomingGames={upcomingGames}
                onRSVPChange={onRSVPChange}
              />
            ) : (
              <AuthButtons
                onShowUserAuth={() => setShowUserAuth(true)}
              />
            )}

            {currentUser && (
              <GroupSelector
                groups={groups}
                selectedGroup={selectedGroup}
                onSelectGroup={selectGroup}
                onCreateGroup={() => setShowCreateGroup(true)}
                loading={loadingGroups}
                error={groupError}
                isAdmin={isAdmin}
              />
            )}
          </div>
        </div>
      ) : (
        // Desktop: Horizontal layout
        <div className="flex items-center justify-between mb-4">
          {/* Left: App Title */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer min-w-0"
          >
            <Trophy className="w-10 h-10 text-yellow-500 flex-shrink-0" />
            <h1 className="text-4xl font-bold text-gray-800 truncate">Changing 500</h1>
          </button>

          {/* Right: User Actions */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {currentUser && (
              <GroupSelector
                groups={groups}
                selectedGroup={selectedGroup}
                onSelectGroup={selectGroup}
                onCreateGroup={() => setShowCreateGroup(true)}
                loading={loadingGroups}
                error={groupError}
                isAdmin={isAdmin}
              />
            )}

            {currentUser ? (
              <UserDropdown
                onProfileClick={() => navigate('/profile')}
                onUserManagementClick={() => navigate('/admin/users')}
                onGroupMembersClick={() => navigate('/groups')}
                onRSVPClick={() => navigate('/rsvp')}
                selectedGroup={selectedGroup}
                upcomingGames={upcomingGames}
                onRSVPChange={onRSVPChange}
              />
            ) : (
              <AuthButtons
                onShowUserAuth={() => setShowUserAuth(true)}
              />
            )}
          </div>
        </div>
      )}

      {/* No Groups Message */}
      {currentUser && groups.length === 0 && !loadingGroups && (
        <div className="mt-6 max-w-md mx-auto text-center">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 mb-4">
              You're not a member of any groups yet.
            </p>
            <button
              onClick={() => setShowCreateGroup(true)}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
            >
              Create Your First Group
            </button>
          </div>
        </div>
      )}

      {/* Status indicators */}
      <div className="flex justify-center items-center gap-4 mt-4">
        {gamesError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm">
            {gamesError}
            <button
              onClick={() => setGamesError('')}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              <X className="w-4 h-4 inline" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HeaderSection;