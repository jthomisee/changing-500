import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Users, ArrowLeft, CheckCircle, XCircle, Clock, MapPin, DollarSign } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useGames } from '../hooks/useGames';
import LoadingButton from '../components/common/LoadingButton.jsx';
import { formatGameDateTime } from '../utils/dateUtils';

const RSVPPage = () => {
  const { gameId, userId } = useParams();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useAuth();
  const { games, scheduledGames, loading: gamesLoading, updateGame, loadAllGames } = useGames();
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState('');

  // Load games on mount
  useEffect(() => {
    loadAllGames();
  }, [loadAllGames]);

  // If specific gameId and userId are provided (from SMS link)
  const specificGame = gameId ? games.find(g => g.id === gameId) : null;
  const targetUserId = userId || currentUser?.userId;

  // Get all upcoming scheduled games for current user across all groups
  const upcomingGames = React.useMemo(() => {
    if (!isAuthenticated || gameId) return [];

    const filtered = scheduledGames.filter(game => {
      const userResult = game.results?.find(r => r.userId === currentUser?.userId);
      const userInvited = !!userResult;

      return userInvited;
    }).sort((a, b) => {
      const aDateTime = new Date(`${a.date}T${a.time || '00:00'}:00.000Z`);
      const bDateTime = new Date(`${b.date}T${b.time || '00:00'}:00.000Z`);
      return aDateTime - bDateTime;
    });

    return filtered;
  }, [isAuthenticated, gameId, currentUser?.userId, scheduledGames]);




  const handleRSVPResponse = async (game, status) => {
    if (!targetUserId) return;

    setUpdating(true);
    setMessage('');

    try {
      // Update the user's RSVP status
      const updatedResults = game.results.map(result => {
        if (result.userId === targetUserId) {
          return { ...result, rsvpStatus: status };
        }
        return result;
      });

      const updatedGame = { ...game, results: updatedResults };
      await updateGame(game.id, updatedGame);

      setMessage(`RSVP updated to "${status}" successfully!`);

      // If this was from an SMS link, show success and option to go home
      if (gameId) {
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to update RSVP:', error);
      setMessage('Failed to update RSVP. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  if (gamesLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading RSVP information...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !gameId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Please Login</h1>
          <p className="text-gray-600 mb-6">You need to be logged in to view your RSVPs.</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Handle specific game RSVP (from SMS link)
  if (gameId) {
    if (!specificGame) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Game Not Found</h1>
            <p className="text-gray-600 mb-6">The game you're looking for doesn't exist or has been removed.</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
            >
              Go Home
            </button>
          </div>
        </div>
      );
    }

    const userResult = specificGame.results?.find(r => r.userId === targetUserId);
    if (!userResult) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Not Invited</h1>
            <p className="text-gray-600 mb-6">You are not invited to this game.</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
            >
              Go Home
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </button>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="text-center mb-6">
                <Calendar className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Poker Night Invitation</h1>
                <p className="text-gray-600">You're invited to join us for poker!</p>
              </div>

              {message && (
                <div className={`mb-6 p-4 rounded-lg ${
                  message.includes('successfully') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {message}
                </div>
              )}

              <div className="border rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-lg mb-2">{formatGameDateTime(specificGame, currentUser?.timezone)}</h3>
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {specificGame.results.length} players invited
                  </div>
                </div>

                <div className="bg-gray-50 rounded p-3">
                  <h4 className="font-medium mb-2">Current RSVP Status:</h4>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    userResult.rsvpStatus === 'yes' ? 'bg-green-100 text-green-800' :
                    userResult.rsvpStatus === 'no' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {userResult.rsvpStatus === 'yes' ? 'Attending' :
                     userResult.rsvpStatus === 'no' ? 'Not Attending' :
                     'Pending Response'}
                  </span>
                </div>
              </div>

              <div className="text-center">
                <p className="text-gray-600 mb-6">Will you be joining us?</p>
                <div className="flex gap-4 justify-center">
                  <LoadingButton
                    loading={updating}
                    onClick={() => handleRSVPResponse(specificGame, 'yes')}
                    className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Yes, I'll be there!
                  </LoadingButton>
                  <LoadingButton
                    loading={updating}
                    onClick={() => handleRSVPResponse(specificGame, 'no')}
                    className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2"
                  >
                    <XCircle className="w-5 h-5" />
                    Can't make it
                  </LoadingButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle general RSVP page showing all pending invitations
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Your Upcoming Games</h1>
            <p className="text-gray-600">View and update your RSVPs for scheduled games</p>
          </div>

          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.includes('successfully') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {message}
            </div>
          )}

          {gamesLoading ? (
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your games...</p>
            </div>
          ) : upcomingGames.length === 0 ? (
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No Upcoming Games</h3>
              <p className="text-gray-600">You don't have any scheduled games at the moment.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {upcomingGames.map((game) => {
                const userResult = game.results.find(r => r.userId === currentUser.userId);
                const currentRSVP = userResult?.rsvpStatus || 'pending';
                return (
                  <div key={game.id} className="bg-white rounded-lg shadow-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-1">
                          {formatGameDateTime(game, currentUser?.timezone)}
                        </h3>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {game.results.length} invited
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            ${game.buyin || 20} buy-in
                          </div>
                          {game.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {game.location}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className={`px-3 py-1 text-sm rounded-full font-medium ${
                        currentRSVP === 'yes' ? 'bg-green-100 text-green-800' :
                        currentRSVP === 'no' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {currentRSVP === 'yes' ? 'Attending' :
                         currentRSVP === 'no' ? 'Not Attending' :
                         'Pending'}
                      </span>
                    </div>

                    <div className="space-y-4">
                      {/* Current RSVP Status Display */}
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <p className="text-sm text-gray-600 mb-2">Your Response:</p>
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-lg ${
                          currentRSVP === 'yes' ? 'bg-green-100 text-green-800 border-2 border-green-300' :
                          currentRSVP === 'no' ? 'bg-red-100 text-red-800 border-2 border-red-300' :
                          'bg-yellow-100 text-yellow-800 border-2 border-yellow-300'
                        }`}>
                          {currentRSVP === 'yes' && <CheckCircle className="w-5 h-5" />}
                          {currentRSVP === 'no' && <XCircle className="w-5 h-5" />}
                          {currentRSVP === 'pending' && <Clock className="w-5 h-5" />}
                          {currentRSVP === 'yes' ? 'You\'re Attending!' :
                           currentRSVP === 'no' ? 'You\'re Not Attending' :
                           'Response Needed'}
                        </div>
                        {currentRSVP !== 'pending' && (
                          <p className="text-xs text-gray-500 mt-2">You can change your response below</p>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-4 justify-center">
                        <LoadingButton
                          loading={updating}
                          onClick={() => handleRSVPResponse(game, 'yes')}
                          className={`px-6 py-2 rounded-lg flex items-center gap-2 transition-all ${
                            currentRSVP === 'yes'
                              ? 'bg-green-100 text-green-800 border-2 border-green-300 hover:bg-green-200'
                              : 'bg-green-600 text-white hover:bg-green-700 border-2 border-green-600'
                          }`}
                        >
                          <CheckCircle className="w-4 h-4" />
                          {currentRSVP === 'yes' ? 'Attending ✓' : 'Accept'}
                        </LoadingButton>
                        <LoadingButton
                          loading={updating}
                          onClick={() => handleRSVPResponse(game, 'no')}
                          className={`px-6 py-2 rounded-lg flex items-center gap-2 transition-all ${
                            currentRSVP === 'no'
                              ? 'bg-red-100 text-red-800 border-2 border-red-300 hover:bg-red-200'
                              : 'bg-red-600 text-white hover:bg-red-700 border-2 border-red-600'
                          }`}
                        >
                          <XCircle className="w-4 h-4" />
                          {currentRSVP === 'no' ? 'Not Attending ✓' : 'Decline'}
                        </LoadingButton>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RSVPPage;