import React from 'react';
import { Save, X } from 'lucide-react';
import LoadingButton from '../common/LoadingButton.jsx';
import PlayerInput from './PlayerInput.jsx';

const GameFormModal = ({
  showAddGame,
  isEditing,
  gameFormError,
  newGame,
  gamesLoading,
  groupUsers,
  groupUsersLoading,
  isGameInFuture,
  onSave,
  onClose,
  updateGameData,
  updatePlayerResult,
  addPlayerToGame,
  removePlayerFromGame,
  addGroupUser
}) => {
  if (!showAddGame) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-screen overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">
          {isEditing ? 'Edit Game' : 'Add New Game'}
        </h3>

        {/* Modal Error Display */}
        {gameFormError && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {gameFormError}
          </div>
        )}

        <form onSubmit={onSave}>
          {/* Basic game info */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2">Date *</label>
              <input
                type="date"
                value={newGame.date}
                onChange={(e) => updateGameData('date', e.target.value)}
                className="w-full max-w-md border rounded px-4 py-3 text-base"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Time</label>
              <input
                type="time"
                value={newGame.time || ''}
                onChange={(e) => updateGameData('time', e.target.value)}
                className="w-full max-w-md border rounded px-4 py-3 text-base"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Location</label>
              <input
                type="text"
                value={newGame.location || ''}
                onChange={(e) => updateGameData('location', e.target.value)}
                className="w-full max-w-md border rounded px-4 py-3 text-base"
                placeholder="e.g. Brad's House, 123 Main St, Online"
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional: Where the game will be played
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Buy-in Amount ($)</label>
              <input
                type="number"
                value={newGame.buyin || 20}
                onChange={(e) => updateGameData('buyin', parseInt(e.target.value) || 20)}
                className="w-full max-w-md border rounded px-4 py-3 text-base"
                min="1"
                max="1000"
              />
              <p className="text-xs text-gray-500 mt-1">
                Default buy-in amount for this game
              </p>
            </div>
            {isEditing && (
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <select
                  value={newGame.status || 'completed'}
                  onChange={(e) => updateGameData('status', e.target.value)}
                  className="w-full max-w-xs border rounded px-4 py-3 text-base"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Change to "Completed" to add results and include in leaderboard
                </p>
              </div>
            )}
            {!isEditing && isGameInFuture(newGame.date, newGame.time) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Future Game:</strong> This game will be created as "Scheduled" for RSVP tracking.
                  You can convert it to "Completed" later to add results.
                </p>
              </div>
            )}
          </div>

          {/* Players - Only show if date is selected */}
          {newGame.date && (
            <>
              <h4 className="font-semibold mb-3">
                {(!isEditing && isGameInFuture(newGame.date, newGame.time)) || (isEditing && newGame.status === 'scheduled') ? 'Players & RSVP' : 'Players & Results'}
              </h4>
              {newGame.results.map((result, index) => (
                <div key={index} className="space-y-4 mb-6 p-4 bg-gray-50 rounded-lg border">
                  <div>
                    <label className="block text-sm font-medium mb-2">Player *</label>
                    <PlayerInput
                      result={result}
                      index={index}
                      groupUsers={groupUsers}
                      allResults={newGame.results}
                      onPlayerChange={updatePlayerResult}
                      onAddGroupUser={addGroupUser}
                      loading={groupUsersLoading}
                    />
                  </div>
                  <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 ${((!isEditing && isGameInFuture(newGame.date, newGame.time)) || (isEditing && newGame.status === 'scheduled')) ? 'lg:grid-cols-2' : 'lg:grid-cols-5'}`}>
                    {!((!isEditing && isGameInFuture(newGame.date, newGame.time)) || (isEditing && newGame.status === 'scheduled')) && (
                      <>
                        <div>
                          <label className="block text-sm font-medium mb-2">Position</label>
                          <input
                            type="number"
                            min="1"
                            value={result.position}
                            onChange={(e) => updatePlayerResult(index, 'position', e.target.value)}
                            className="w-full border rounded px-3 py-2 text-base"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Winnings ($)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={result.winnings}
                            onChange={(e) => updatePlayerResult(index, 'winnings', e.target.value)}
                            className="w-full border rounded px-3 py-2 text-base"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Rebuys</label>
                          <input
                            type="number"
                            min="0"
                            value={result.rebuys}
                            onChange={(e) => updatePlayerResult(index, 'rebuys', e.target.value)}
                            className="w-full border rounded px-3 py-2 text-base"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Best Hand</label>
                          <div className="space-y-2">
                            <label className="flex items-center text-sm">
                              <input
                                type="checkbox"
                                checked={result.bestHandParticipant}
                                onChange={(e) => updatePlayerResult(index, 'bestHandParticipant', e.target.checked)}
                                className="mr-2"
                              />
                              Participated
                            </label>
                            <label className="flex items-center text-sm">
                              <input
                                type="checkbox"
                                checked={result.bestHandWinner}
                                onChange={(e) => updatePlayerResult(index, 'bestHandWinner', e.target.checked)}
                                className="mr-2"
                              />
                              Won
                            </label>
                          </div>
                        </div>
                      </>
                    )}
                    {((!isEditing && isGameInFuture(newGame.date, newGame.time)) || (isEditing && newGame.status === 'scheduled')) && (
                      <div>
                        <label className="block text-sm font-medium mb-2">RSVP Status</label>
                        <select
                          value={result.rsvpStatus || 'pending'}
                          onChange={(e) => updatePlayerResult(index, 'rsvpStatus', e.target.value)}
                          className="w-full border rounded px-3 py-2 text-base"
                        >
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                          <option value="pending">Pending</option>
                        </select>
                      </div>
                    )}
                    <div className="flex items-end">
                      {newGame.results.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePlayerFromGame(index)}
                          className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addPlayerToGame}
                className="mb-4 text-blue-600 hover:text-blue-800 text-sm underline"
              >
                + Add Player
              </button>
            </>
          )}

          {/* Form buttons */}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <LoadingButton
              loading={gamesLoading}
              className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isEditing ? 'Update Game' : 'Save Game'}
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GameFormModal;