import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Users, CheckCircle, XCircle, Clock, MapPin, DollarSign, ArrowLeft } from 'lucide-react';
import { apiCall } from '../services/api';
import LoadingButton from '../components/common/LoadingButton.jsx';
import { formatGameDateTime } from '../utils/dateUtils';

const TokenRSVPPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) {
      loadGameFromToken();
    }
  }, [token]);

  const loadGameFromToken = async () => {
    try {
      const response = await apiCall(`/rsvp-token/${token}`, {
        method: 'GET'
      });

      if (response.success) {
        setGame(response.game);
        setUser(response.user);
      } else {
        setError(response.error || 'Invalid or expired RSVP link');
      }
    } catch (err) {
      console.error('Error loading RSVP token:', err);
      setError('Invalid or expired RSVP link');
    } finally {
      setLoading(false);
    }
  };

  const handleRSVPResponse = async (rsvpStatus) => {
    if (!game || !user) return;

    setUpdating(true);
    setMessage('');

    try {
      const response = await apiCall(`/rsvp-token/${token}/respond`, {
        method: 'PUT',
        body: JSON.stringify({ rsvpStatus })
      });

      if (response.success) {
        setMessage(`RSVP updated successfully! You are ${rsvpStatus === 'yes' ? 'attending' : 'not attending'}.`);
        // Update the game state to reflect the new RSVP status
        setGame(prev => ({
          ...prev,
          results: prev.results.map(r =>
            r.userId === user.userId ? { ...r, rsvpStatus } : r
          )
        }));
      } else {
        setMessage(`Error: ${response.error || 'Failed to update RSVP'}`);
      }
    } catch (err) {
      console.error('Error updating RSVP:', err);
      setMessage('Error: Failed to update RSVP. Please try again.');
    } finally {
      setUpdating(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your game invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Invalid Link</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (!game || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Game Not Found</h2>
          <p className="text-gray-600">Unable to load game information.</p>
        </div>
      </div>
    );
  }

  const userResult = game.results?.find(r => r.userId === user.userId);
  const currentRSVP = userResult?.rsvpStatus || 'pending';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Game Invitation</h1>
          <p className="text-gray-600">Hi {user.firstName}, you're invited to poker night!</p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.includes('successfully') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {message}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-1">
                {formatGameDateTime(game, 'America/New_York')}
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
                onClick={() => handleRSVPResponse('yes')}
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
                onClick={() => handleRSVPResponse('no')}
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

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-1 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to Main App
          </button>
        </div>
      </div>
    </div>
  );
};

export default TokenRSVPPage;