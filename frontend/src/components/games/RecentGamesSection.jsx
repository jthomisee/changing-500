import React from 'react';
import { Calendar, DollarSign, Users, Edit, Trash2, Trophy, MapPin } from 'lucide-react';
import LoadingButton from '../common/LoadingButton.jsx';
import { calculatePoints } from '../../utils/gameUtils';
import { NoGamesEmptyState, SelectGroupEmptyState } from '../common/EmptyState.jsx';
import { useGameContext } from '../../context/GameContext.jsx';

const RecentGamesSection = ({ openAddGame }) => {
  const {
    selectedGroup,
    filteredGames,
    currentUser,
    formatGameDateTime,
    sendingNotifications,
    isAuthenticated,
    handleSendResults,
    startEditingGame,
    deleteGame,
    getUserDisplayName,
    isGameScheduled
  } = useGameContext();

  const recentGames = filteredGames.filter(game => !isGameScheduled(game));

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-green-600" />
          <h2 className="text-2xl font-semibold text-gray-800">
            Recent Games {selectedGroup ? `- ${selectedGroup.name}` : ''}
          </h2>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {!selectedGroup ? (
          <SelectGroupEmptyState />
        ) : recentGames.length === 0 ? (
          <NoGamesEmptyState
            groupName={selectedGroup.name}
            onAddGame={openAddGame}
            isAuthenticated={isAuthenticated}
          />
        ) : (
          recentGames
            .sort((a, b) => {
              // Sort by date/time with most recent first
              const aDateTime = new Date(`${a.date}T${a.time || '00:00'}:00.000Z`);
              const bDateTime = new Date(`${b.date}T${b.time || '00:00'}:00.000Z`);
              return bDateTime - aDateTime; // Most recent first
            })
            .map((game) => (
              <div key={game.id} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {formatGameDateTime(game)}
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
                      ${game.results.reduce((sum, r) => sum + r.winnings, 0)} total
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      {game.results.length} players
                    </div>
                    {game.buyin && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        ${game.buyin} buy-in
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <LoadingButton
                      onClick={() => handleSendResults(game.id)}
                      loading={sendingNotifications}
                      disabled={!isAuthenticated}
                      className={`px-3 py-1 text-sm rounded-lg ${
                        isAuthenticated
                          ? 'bg-purple-600 text-white hover:bg-purple-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                      title={isAuthenticated ? "Send game results" : "Please login to send results"}
                    >
                      Send Results
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

                {/* Game results table */}
                <div className="bg-gray-50 rounded p-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-300">
                          {!isGameScheduled(game) && (
                            <th className="text-left py-2 px-3">Pos</th>
                          )}
                          <th className="text-left py-2 px-3">Player</th>
                          {!isGameScheduled(game) && (
                            <>
                              <th className="text-center py-2 px-3">Points</th>
                              <th className="text-center py-2 px-3">Winnings</th>
                              <th className="text-center py-2 px-3">Rebuys</th>
                              <th className="text-center py-2 px-3">Best Hand</th>
                            </>
                          )}
                          {isGameScheduled(game) && (
                            <th className="text-center py-2 px-3">RSVP</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {game.results
                          .slice()
                          .sort((a, b) => a.position - b.position)
                          .map((result, index) => {
                            const points = calculatePoints(game.results, result);
                            const getRowColorClass = () => {
                              if (result.position === 1) return 'bg-gradient-to-r from-yellow-100 to-yellow-50 border-b border-gray-200 last:border-b-0';
                              if (result.position === 2) return 'bg-gradient-to-r from-slate-200 to-slate-100 border-b border-gray-200 last:border-b-0';
                              return 'border-b border-gray-200 last:border-b-0';
                            };
                            return (
                              <tr key={index} className={getRowColorClass()}>
                                {!isGameScheduled(game) && (
                                  <td className="py-2 px-3 font-medium">
                                    <div className="flex items-center gap-1">
                                      {result.position === 1 && <Trophy className="w-3 h-3 text-yellow-600" />}
                                      #{result.position}
                                    </div>
                                  </td>
                                )}
                                <td className="py-2 px-3 font-medium">{getUserDisplayName(result.userId)}</td>
                                {!isGameScheduled(game) && (
                                  <>
                                    <td className="py-2 px-3 text-center text-blue-600 font-semibold">
                                      {points.toFixed(1)}
                                    </td>
                                    <td className={`py-2 px-3 text-center font-medium ${
                                      result.winnings >= 0 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                      ${result.winnings.toFixed(0)}
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                      {result.rebuys > 0 ? result.rebuys : '-'}
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                      {result.bestHandWinner ? (
                                        <span className="text-purple-600 font-semibold">Won</span>
                                      ) : result.bestHandParticipant ? (
                                        <span className="text-gray-600">Played</span>
                                      ) : (
                                        '-'
                                      )}
                                    </td>
                                  </>
                                )}
                                {isGameScheduled(game) && (
                                  <td className="py-2 px-3 text-center">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                      result.rsvpStatus === 'yes' ? 'bg-green-100 text-green-800' :
                                      result.rsvpStatus === 'no' ? 'bg-red-100 text-red-800' :
                                      result.rsvpStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {result.rsvpStatus || 'Pending'}
                                    </span>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
};

export default RecentGamesSection;