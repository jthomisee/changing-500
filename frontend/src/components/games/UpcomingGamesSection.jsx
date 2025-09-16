import React from 'react';
import { Calendar, DollarSign, Users, Edit, Trash2, MapPin } from 'lucide-react';
import LoadingButton from '../common/LoadingButton.jsx';
import { useGameContext } from '../../context/GameContext.jsx';

const UpcomingGamesSection = () => {
  const {
    selectedGroup,
    scheduledGames,
    formatGameDateTime,
    sendingNotifications,
    isAuthenticated,
    handleSendInvitations,
    startEditingGame,
    deleteGame,
    getUserDisplayName,
    currentUser,
    handleRSVPChange
  } = useGameContext();

  if (!selectedGroup) return null;

  const groupScheduledGames = scheduledGames.filter(game => game.groupId === selectedGroup.groupId);

  if (groupScheduledGames.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg mb-8">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-semibold text-gray-800">
            Upcoming Games - {selectedGroup.name}
          </h2>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {groupScheduledGames
          .sort((a, b) => {
            // Sort upcoming games by date/time (earliest first)
            const aDateTime = new Date(`${a.date}T${a.time || '00:00'}:00.000Z`);
            const bDateTime = new Date(`${b.date}T${b.time || '00:00'}:00.000Z`);
            return aDateTime - bDateTime;
          })
          .map((game) => (
            <div key={game.id} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">
                    {formatGameDateTime(game)}
                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      Scheduled
                    </span>
                  </h3>
                  {game.location && (
                    <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                      <MapPin className="w-4 h-4" />
                      {game.location}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <DollarSign className="w-4 h-4" />
                    ${game.buyin || 20} buy-in
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    {game.results.length} invited
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <LoadingButton
                    onClick={() => handleSendInvitations(game.id)}
                    loading={sendingNotifications}
                    disabled={!isAuthenticated}
                    className={`px-3 py-1 text-sm rounded-lg ${
                      isAuthenticated
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    title={isAuthenticated ? "Send game invitations" : "Please login to send invitations"}
                  >
                    Send Invitations
                  </LoadingButton>
                  <button
                    onClick={() => isAuthenticated && startEditingGame(game)}
                    className={`p-2 rounded-lg ${
                      isAuthenticated
                        ? 'text-blue-600 hover:text-blue-800 hover:bg-blue-50'
                        : 'text-gray-400 cursor-not-allowed'
                    }`}
                    disabled={!isAuthenticated}
                    title={isAuthenticated ? "Edit game" : "Please login to edit games"}
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => isAuthenticated && deleteGame(game.id)}
                    className={`p-2 rounded-lg ${
                      isAuthenticated
                        ? 'text-red-600 hover:text-red-800 hover:bg-red-50'
                        : 'text-gray-400 cursor-not-allowed'
                    }`}
                    disabled={!isAuthenticated}
                    title={isAuthenticated ? "Delete game" : "Please login to delete games"}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Game RSVP table */}
              <div className="bg-gray-50 rounded p-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-300">
                        <th className="text-left py-2 px-3">Player</th>
                        <th className="text-center py-2 px-3">RSVP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {game.results
                        .slice()
                        .sort((a, b) => {
                          // Sort by RSVP status: yes, pending, no
                          const order = { yes: 0, pending: 1, no: 2 };
                          return (order[a.rsvpStatus] || 1) - (order[b.rsvpStatus] || 1);
                        })
                        .map((result, index) => {
                          const isCurrentUser = result.userId === currentUser?.userId;
                          return (
                            <tr key={index} className="border-b border-gray-200 last:border-b-0">
                              <td className="py-2 px-3 font-medium">{getUserDisplayName(result.userId)}</td>
                              <td className="py-2 px-3 text-center">
                                {isCurrentUser ? (
                                  <select
                                    value={result.rsvpStatus || 'pending'}
                                    onChange={(e) => handleRSVPChange(game.id, e.target.value)}
                                    className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
                                  >
                                    <option value="yes">Yes</option>
                                    <option value="no">No</option>
                                    <option value="pending">Pending</option>
                                  </select>
                                ) : (
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    result.rsvpStatus === 'yes' ? 'bg-green-100 text-green-800' :
                                    result.rsvpStatus === 'no' ? 'bg-red-100 text-red-800' :
                                    result.rsvpStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {result.rsvpStatus || 'Pending'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default UpcomingGamesSection;