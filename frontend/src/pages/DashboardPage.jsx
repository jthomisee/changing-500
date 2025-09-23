import React, { useMemo } from 'react';
import {
  Calendar,
  Clock,
  Trophy,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Users,
} from 'lucide-react';

const DashboardPage = ({
  currentUser,
  selectedGroup,
  groups,
  upcomingGames,
  standings,
  onRSVPChange,
  onNavigateToGames,
  onNavigateToGroups,
}) => {
  // Calculate pending actions and quick stats
  const dashboardData = useMemo(() => {
    if (!currentUser) return null;

    const pendingRSVPs = upcomingGames.filter((game) => {
      const userResult = game.results?.find(
        (r) => r.userId === currentUser.userId
      );
      return !userResult?.rsvpStatus || userResult.rsvpStatus === 'pending';
    });

    const confirmedGames = upcomingGames.filter((game) => {
      const userResult = game.results?.find(
        (r) => r.userId === currentUser.userId
      );
      return userResult?.rsvpStatus === 'yes';
    });

    const userStanding = standings.find((s) => s.userId === currentUser.userId);

    return {
      pendingRSVPs,
      confirmedGames: confirmedGames.slice(0, 3), // Next 3 games
      userStanding,
      groupName: selectedGroup?.name || 'No Group Selected',
    };
  }, [currentUser, upcomingGames, standings, selectedGroup]);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Welcome!
          </h2>
          <p className="text-gray-600">Please log in to view your dashboard.</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) return null;

  const { pendingRSVPs, confirmedGames, userStanding, groupName } =
    dashboardData;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {currentUser.firstName}!
            </h1>
            {selectedGroup && (
              <p className="mt-2 text-gray-600">
                Here's what's happening in {groupName}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Action Items */}
        {pendingRSVPs.length > 0 && (
          <div className="mb-8">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-amber-600 mr-2" />
                <h3 className="text-lg font-semibold text-amber-800">
                  Action Required
                </h3>
              </div>
              <p className="text-amber-700 mt-1 mb-4">
                You have {pendingRSVPs.length} game
                {pendingRSVPs.length !== 1 ? 's' : ''} waiting for your RSVP
              </p>
              <div className="space-y-3">
                {pendingRSVPs.slice(0, 3).map((game) => (
                  <PendingRSVPCard
                    key={game.id}
                    game={game}
                    currentUser={currentUser}
                    onRSVPChange={onRSVPChange}
                  />
                ))}
                {pendingRSVPs.length > 3 && (
                  <button
                    onClick={() => onNavigateToGames('schedule')}
                    className="text-amber-700 hover:text-amber-800 font-medium"
                  >
                    View {pendingRSVPs.length - 3} more...
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <QuickStatCard
            title="Your Ranking"
            value={userStanding ? `#${userStanding.rank}` : 'N/A'}
            subtitle={`in ${groupName}`}
            icon={Trophy}
            color="yellow"
          />
          <QuickStatCard
            title="Upcoming Games"
            value={confirmedGames.length}
            subtitle="confirmed"
            icon={Calendar}
            color="blue"
          />
          <QuickStatCard
            title="Win Rate"
            value={userStanding ? `${userStanding.winRate}%` : 'N/A'}
            subtitle="this season"
            icon={TrendingUp}
            color="green"
          />
        </div>

        {/* Upcoming Games */}
        {confirmedGames.length > 0 && (
          <div className="mb-8">
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Next Games
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {confirmedGames.map((game) => (
                    <UpcomingGameCard
                      key={game.id}
                      game={game}
                      currentUser={currentUser}
                      onRSVPChange={onRSVPChange}
                    />
                  ))}
                </div>
                <button
                  onClick={() => onNavigateToGames('schedule')}
                  className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                >
                  View all upcoming games →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ActionCard
            title="Manage Games"
            description="View schedule, check history, or create new games"
            icon={Calendar}
            onClick={() => onNavigateToGames()}
            color="blue"
          />
          {groups && groups.length === 0 ? (
            <ActionCard
              title="Create or Join a Group"
              description="Find a group to join or create your own to start playing"
              icon={Users}
              onClick={() => onNavigateToGroups('join')}
              color="green"
            />
          ) : (
            <ActionCard
              title="Group Settings"
              description="View leaderboard, manage members, or switch groups"
              icon={Users}
              onClick={() => onNavigateToGroups()}
              color="green"
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Helper Components
const QuickStatCard = ({ title, value, subtitle, icon: Icon, color }) => {
  const colorClasses = {
    yellow: 'text-yellow-600',
    blue: 'text-blue-600',
    green: 'text-green-600',
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center">
        <Icon className={`w-6 h-6 ${colorClasses[color]} mr-3`} />
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
      </div>
    </div>
  );
};

const PendingRSVPCard = ({ game, currentUser, onRSVPChange }) => {
  const gameDateTime = new Date(`${game.date}T${game.time || '00:00'}:00.000Z`);

  return (
    <div className="bg-white rounded-lg border border-amber-200 p-4">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">
            {game.location || 'Poker Game'}
          </h4>
          <div className="flex items-center text-sm text-gray-600 mt-1">
            <Clock className="w-4 h-4 mr-1" />
            {gameDateTime.toLocaleDateString()} at{' '}
            {gameDateTime.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
        <div className="flex space-x-2 ml-4">
          <button
            onClick={() => onRSVPChange(game.id, 'yes')}
            className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
          >
            Yes
          </button>
          <button
            onClick={() => onRSVPChange(game.id, 'no')}
            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            No
          </button>
        </div>
      </div>
    </div>
  );
};

const UpcomingGameCard = ({ game, currentUser, onRSVPChange }) => {
  const gameDateTime = new Date(`${game.date}T${game.time || '00:00'}:00.000Z`);
  const userResult = game.results?.find(
    (r) => r.userId === currentUser?.userId
  );
  const rsvp = userResult?.rsvpStatus || 'pending';

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center">
        <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
        <div>
          <p className="font-medium text-gray-900">
            {game.location || 'Poker Game'}
          </p>
          <p className="text-sm text-gray-600">
            {gameDateTime.toLocaleDateString()} at{' '}
            {gameDateTime.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">RSVP:</span>
        <select
          value={rsvp}
          onChange={(e) => onRSVPChange(game.id, e.target.value)}
          className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
        >
          <option value="yes">Yes</option>
          <option value="no">No</option>
          <option value="pending">Pending</option>
        </select>
      </div>
    </div>
  );
};

const ActionCard = ({ title, description, icon: Icon, onClick, color }) => {
  const colorClasses = {
    blue: 'border-blue-200 hover:border-blue-300 hover:shadow-blue-100',
    green: 'border-green-200 hover:border-green-300 hover:shadow-green-100',
  };

  return (
    <button
      onClick={onClick}
      className={`bg-white rounded-lg border p-6 text-left hover:shadow-lg transition-all ${colorClasses[color]}`}
    >
      <div className="flex items-center mb-3">
        <Icon
          className={`w-6 h-6 ${color === 'blue' ? 'text-blue-600' : 'text-green-600'} mr-3`}
        />
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      <p className="text-gray-600">{description}</p>
    </button>
  );
};

export default DashboardPage;
