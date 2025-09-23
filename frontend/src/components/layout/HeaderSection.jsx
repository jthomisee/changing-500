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
  setShowUserAuth,
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
            <h1
              className="text-2xl font-bold text-gray-800"
              style={{ fontFamily: 'Fredoka One, cursive' }}
            >
              Changing 500
            </h1>
          </button>

          {/* User Actions - Below title, stacked vertically */}
          <div className="flex flex-col items-center gap-3">
            {currentUser ? (
              <UserDropdown
                onProfileClick={() => navigate('/profile')}
                onUserManagementClick={() => navigate('/admin/users')}
                onGroupMembersClick={() => navigate('/groups')}
                onRSVPClick={() => navigate('/rsvp')}
                onGameHistoryClick={() => navigate('/game-history')}
                selectedGroup={selectedGroup}
                upcomingGames={upcomingGames}
                onRSVPChange={onRSVPChange}
              />
            ) : (
              <AuthButtons onShowUserAuth={() => setShowUserAuth(true)} />
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
        // Desktop: Horizontal layout with centered title
        <div className="flex items-center justify-center mb-4 mt-3 relative">
          {/* Centered App Title */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <Trophy className="w-10 h-10 text-yellow-500 flex-shrink-0" />
            <h1
              className="text-4xl font-bold text-gray-800"
              style={{ fontFamily: 'Fredoka One, cursive' }}
            >
              Changing 500
            </h1>
          </button>

          {/* Right: User Actions - Positioned absolutely to not affect centering */}
          <div className="absolute right-0 flex items-center gap-3 flex-shrink-0">
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
                onGameHistoryClick={() => navigate('/game-history')}
                selectedGroup={selectedGroup}
                upcomingGames={upcomingGames}
                onRSVPChange={onRSVPChange}
              />
            ) : (
              <AuthButtons onShowUserAuth={() => setShowUserAuth(true)} />
            )}
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
