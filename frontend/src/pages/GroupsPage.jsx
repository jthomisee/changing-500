import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Users,
  Crown,
  Settings,
  Search,
  Plus,
  Trophy,
  Calendar,
  TrendingUp,
} from 'lucide-react';

// Import existing components
import GroupManagement from '../components/groups/GroupManagement.jsx';
import LeaderboardSection from '../components/games/LeaderboardSection.jsx';
import GroupFormModal from '../components/groups/GroupFormModal.jsx';
import GroupSelector from '../components/groups/GroupSelector.jsx';
import { SideBetManagement } from '../components/groups/SideBetManagement.jsx';
import GameTemplateManagement from '../components/groups/GameTemplateManagement.jsx';
import { GameProvider } from '../context/GameContext.jsx';
import { isGameScheduled } from '../utils/gameUtils.js';
import { DEFAULT_VALUES } from '../constants/ui.js';
import { formatGameDateTime as formatGameDateTimeUtil } from '../utils/dateUtils.js';
import { listPublicGroups, joinGroup } from '../services/groupService.js';

const GroupsPage = ({
  currentUser,
  isAdmin,
  groups,
  selectedGroup,
  loadingGroups,
  groupError,
  selectGroup,
  createNewGroup,
  standings,
  standingsLoading,
  sortField,
  sortDirection,
  handleSort,
  tournamentStandings,
  tournamentStandingsLoading,
  tournamentSortField,
  tournamentSortDirection,
  handleTournamentSort,
  cashStandings,
  cashStandingsLoading,
  cashSortField,
  cashSortDirection,
  handleCashSort,
  expandedRows,
  toggleRowExpanded,
  isMobile,
  onCreateGroup,
  setShowCreateGroup,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'current';
  const [groupSearch, setGroupSearch] = useState('');
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [publicGroups, setPublicGroups] = useState([]);
  const [loadingPublicGroups, setLoadingPublicGroups] = useState(false);
  const [manageTab, setManageTab] = useState('settings'); // 'settings', 'sidebets', or 'templates'
  const [publicGroupsError, setPublicGroupsError] = useState('');
  const [publicGroupsSuccess, setPublicGroupsSuccess] = useState('');
  const [joiningGroup, setJoiningGroup] = useState(null);

  const setActiveTab = (tab) => {
    setSearchParams({ tab });
  };

  const handleCreateGroup = () => {
    setShowGroupForm(true);
  };

  const handleGroupCreated = (newGroup) => {
    // Refresh groups list or handle new group
    if (onCreateGroup) {
      onCreateGroup(newGroup);
    }

    // Auto-select the new group
    if (newGroup && selectGroup) {
      selectGroup(newGroup);
    }

    // Navigate to the manage tab for the new group
    setSearchParams({ tab: 'manage' });

    // Close the group form modal
    setShowGroupForm(false);
  };

  const loadPublicGroups = async () => {
    setLoadingPublicGroups(true);
    setPublicGroupsError('');
    setPublicGroupsSuccess('');

    try {
      const result = await listPublicGroups(groupSearch);
      if (result.success) {
        setPublicGroups(result.groups);
      } else {
        setPublicGroupsError(result.error);
      }
    } catch (error) {
      setPublicGroupsError('Failed to load public groups');
    } finally {
      setLoadingPublicGroups(false);
    }
  };

  const handleJoinGroup = async (groupId) => {
    if (joiningGroup) return; // Prevent double-clicks

    setJoiningGroup(groupId);
    setPublicGroupsError('');
    setPublicGroupsSuccess('');
    try {
      const result = await joinGroup(groupId);
      if (result.success) {
        // Refresh groups list or navigate to the joined group
        if (onCreateGroup) {
          onCreateGroup(result.group);
        }
        setPublicGroupsSuccess(`Successfully joined ${result.group.name}!`);
        // Refresh public groups to update join status
        loadPublicGroups();
      } else {
        setPublicGroupsError('Failed to join group: ' + result.error);
      }
    } catch (error) {
      setPublicGroupsError('Failed to join group: ' + error.message);
    } finally {
      setJoiningGroup(null);
    }
  };

  // Load public groups when on join tab (without search term to avoid triggering on every input change)
  React.useEffect(() => {
    if (activeTab === 'join') {
      loadPublicGroups();
    }
  }, [activeTab]);

  const tabs = [
    {
      id: 'current',
      label: 'Group Info',
      icon: Users,
      description: 'Leaderboard and group info',
    },
    {
      id: 'join',
      label: 'Join A Group',
      icon: Plus,
      description: 'Find and join public groups',
    },
    ...(selectedGroup?.userRole === 'owner' || isAdmin
      ? [
          {
            id: 'manage',
            label: 'Manage',
            icon: Settings,
            description: 'Manage members and settings',
          },
        ]
      : []),
  ];

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Authentication Required
          </h2>
          <p className="text-gray-600">Please log in to view groups.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-2" />
                  {tab.label}
                  <span className="hidden md:block ml-2 text-xs text-gray-400">
                    {tab.description}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-none mx-auto px-4 sm:px-6 lg:px-12 py-8">
        {activeTab === 'current' && selectedGroup && (
          <div>
            {/* Group Info Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-blue-100 rounded-full p-3 mr-4">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {selectedGroup.name}
                    </h2>
                    <p className="text-gray-600">
                      {selectedGroup.userRole === 'owner' && (
                        <span className="inline-flex items-center">
                          <Crown className="w-4 h-4 text-yellow-500 mr-1" />
                          Group Owner
                        </span>
                      )}
                      {selectedGroup.userRole === 'member' && 'Group Member'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Your Rank</p>
                  <p className="text-2xl font-bold text-blue-600">
                    #
                    {standings.find((s) => s.userId === currentUser.userId)
                      ?.rank || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Leaderboard */}
            <GameProvider
              games={[]}
              scheduledGames={[]}
              filteredGames={[]}
              currentUser={currentUser}
              selectedGroup={selectedGroup}
              groupUsers={[]}
              formatGameDateTime={(game) => {
                const userTimezone =
                  currentUser?.timezone || DEFAULT_VALUES.TIMEZONE;
                return formatGameDateTimeUtil(game, userTimezone);
              }}
              getUserDisplayName={() => 'Unknown User'}
              isGameScheduled={isGameScheduled}
              startEditingGame={() => {}}
              deleteGame={() => {}}
              handleSendInvitations={() => {}}
              handleSendResults={() => {}}
              handleRSVPChange={() => {}}
              gamesLoading={false}
              sendingNotifications={false}
              isAuthenticated={!!currentUser}
            >
              {/* Tournament Leaderboard */}
              <LeaderboardSection
                isMobile={isMobile}
                standings={tournamentStandings}
                standingsLoading={tournamentStandingsLoading}
                sortField={tournamentSortField}
                sortDirection={tournamentSortDirection}
                handleSort={handleTournamentSort}
                expandedRows={expandedRows}
                toggleRowExpanded={toggleRowExpanded}
                gameType="tournament"
              />

              {/* Cash Game Leaderboard */}
              <LeaderboardSection
                isMobile={isMobile}
                standings={cashStandings}
                standingsLoading={cashStandingsLoading}
                sortField={cashSortField}
                sortDirection={cashSortDirection}
                handleSort={handleCashSort}
                expandedRows={expandedRows}
                toggleRowExpanded={toggleRowExpanded}
                gameType="cash"
              />
            </GameProvider>
          </div>
        )}

        {activeTab === 'current' && !selectedGroup && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Group Selected
            </h3>
            <p className="text-gray-600 mb-6">
              Join a group to see the leaderboard and start playing.
            </p>
            <button
              onClick={() => setActiveTab('join')}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg"
            >
              Browse Groups
            </button>
          </div>
        )}

        {activeTab === 'join' && (
          <div>
            {/* Create Group Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Create a New Group
                  </h3>
                  <p className="text-gray-600 mt-1">
                    Start your own poker group and invite friends
                  </p>
                </div>
                <button
                  onClick={handleCreateGroup}
                  className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg flex items-center"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create Group
                </button>
              </div>
            </div>

            {/* Public Groups Search */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Search className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Join a Public Group
                </h3>
              </div>

              <div className="mb-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search public groups..."
                      value={groupSearch}
                      onChange={(e) => setGroupSearch(e.target.value)}
                      onKeyPress={(e) =>
                        e.key === 'Enter' && loadPublicGroups()
                      }
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={loadingPublicGroups}
                    />
                  </div>
                  <button
                    onClick={loadPublicGroups}
                    disabled={loadingPublicGroups}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loadingPublicGroups ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    Search
                  </button>
                </div>
              </div>

              {/* Error Display */}
              {publicGroupsError && (
                <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {publicGroupsError}
                </div>
              )}

              {/* Success Display */}
              {publicGroupsSuccess && (
                <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                  {publicGroupsSuccess}
                </div>
              )}

              {/* Public Groups Grid */}
              {loadingPublicGroups ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="bg-gray-50 rounded-lg border border-gray-200 p-4 animate-pulse"
                    >
                      <div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  ))}
                </div>
              ) : publicGroups.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {publicGroups.map((group) => (
                    <PublicGroupCard
                      key={group.groupId}
                      group={group}
                      onJoin={() => handleJoinGroup(group.groupId)}
                      isJoining={joiningGroup === group.groupId}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-lg font-medium mb-2">
                    {groupSearch
                      ? 'No public groups found'
                      : 'No public groups available'}
                  </p>
                  <p className="text-sm">
                    {groupSearch
                      ? 'Try a different search term or create a new group.'
                      : 'Be the first to create a public group that others can join!'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'manage' &&
          (selectedGroup?.userRole === 'owner' || isAdmin) && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {/* Manage Sub-tabs */}
              <div className="mb-6">
                <div className="border-b border-gray-200">
                  <nav className="-mb-px flex space-x-8">
                    <button
                      onClick={() => setManageTab('settings')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        manageTab === 'settings'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center">
                        <Settings className="w-4 h-4 mr-2" />
                        Group Settings
                      </div>
                    </button>
                    <button
                      onClick={() => setManageTab('sidebets')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        manageTab === 'sidebets'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center">
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Side Bets
                      </div>
                    </button>
                    <button
                      onClick={() => setManageTab('templates')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        manageTab === 'templates'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2" />
                        Templates
                      </div>
                    </button>
                  </nav>
                </div>
              </div>

              {/* Tab Content */}
              {manageTab === 'settings' && (
                <GroupManagement
                  selectedGroup={selectedGroup}
                  onClose={() => setActiveTab('current')}
                  onGroupDeleted={(deletedGroupId) => {
                    // Find another group to select, or show join tab if no groups remain
                    const remainingGroups = groups.filter(
                      (g) => g.groupId !== deletedGroupId
                    );
                    if (remainingGroups.length > 0) {
                      // Select the first remaining group
                      selectGroup(remainingGroups[0]);
                      setActiveTab('current');
                    } else {
                      // No groups remaining, show join tab
                      setActiveTab('join');
                    }
                  }}
                />
              )}

              {manageTab === 'sidebets' && (
                <SideBetManagement
                  groupId={selectedGroup?.groupId}
                  groupRole={selectedGroup?.userRole}
                />
              )}
              {manageTab === 'templates' && (
                <GameTemplateManagement
                  selectedGroup={selectedGroup}
                  onClose={() => setActiveTab('current')}
                />
              )}
            </div>
          )}
      </div>

      {/* Group Creation Modal */}
      <GroupFormModal
        show={showGroupForm}
        onClose={() => setShowGroupForm(false)}
        onGroupCreated={handleGroupCreated}
      />
    </div>
  );
};

// Helper Components

// Public Group Card Component
const PublicGroupCard = ({ group, onJoin, isJoining }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          <div className="bg-green-100 rounded-full p-2 mr-3">
            <Users className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{group.name}</h3>
            <div className="flex items-center text-sm text-gray-600">
              <span className="inline-flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                Public Group
              </span>
            </div>
          </div>
        </div>
        {group.isJoined && (
          <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded">
            Joined
          </div>
        )}
      </div>

      {group.description && (
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {group.description}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 text-center mb-4">
        <div>
          <p className="text-xs text-gray-500">Members</p>
          <p className="font-semibold text-gray-900">
            {group.memberCount || 'N/A'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Games</p>
          <p className="font-semibold text-gray-900">
            {group.gameCount || 'N/A'}
          </p>
        </div>
      </div>

      <button
        onClick={onJoin}
        disabled={isJoining || group.isJoined}
        className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
          group.isJoined
            ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
            : isJoining
              ? 'bg-blue-300 text-white cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
        }`}
      >
        {isJoining ? (
          <div className="flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            Joining...
          </div>
        ) : group.isJoined ? (
          'Already Joined'
        ) : (
          'Join Group'
        )}
      </button>
    </div>
  );
};

export default GroupsPage;
