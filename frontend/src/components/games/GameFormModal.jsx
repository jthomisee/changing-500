import React from 'react';
import { Save, X } from 'lucide-react';
import LoadingButton from '../common/LoadingButton.jsx';
import PlayerInput from './PlayerInput.jsx';
import { useSideBets } from '../../hooks/useSideBets.js';
import { useGameTemplates } from '../../hooks/useGameTemplates.js';

const GameFormModal = ({
  showAddGame,
  isEditing,
  gameFormError,
  newGame,
  gamesLoading,
  groupUsers,
  groupUsersLoading,
  isGameInFuture,
  selectedGroup,
  onSave,
  onClose,
  updateGameData,
  updatePlayerResult,
  addPlayerToGame,
  removePlayerFromGame,
  addGroupUser,
}) => {
  const {
    activeSideBets,
    loading: sideBetsLoading,
    error: sideBetsError,
  } = useSideBets(selectedGroup?.groupId);
  const {
    templates,
    loading: templatesLoading,
    error: templatesError,
  } = useGameTemplates(selectedGroup?.groupId);

  const applyTemplate = (template) => {
    // Apply basic template data
    if (template.location) {
      updateGameData('location', template.location);
    }
    if (template.buyin) {
      updateGameData('buyin', template.buyin);
    }
    if (template.maxPlayers) {
      updateGameData('maxPlayers', template.maxPlayers);
    }
    if (template.waitlistEnabled !== undefined) {
      updateGameData('waitlistEnabled', template.waitlistEnabled);
    }

    // Apply game type and related settings
    if (template.gameType) {
      updateGameData('gameType', template.gameType);
    }
    if (template.minBuyIn) {
      updateGameData('minBuyIn', template.minBuyIn);
    }
    if (template.maxBuyIn) {
      updateGameData('maxBuyIn', template.maxBuyIn);
    }
    if (template.houseTake !== undefined) {
      updateGameData('houseTake', template.houseTake);
    }
    if (template.houseTakeType) {
      updateGameData('houseTakeType', template.houseTakeType);
    }
    if (template.payoutStructure) {
      updateGameData('payoutStructure', template.payoutStructure);
    }

    // Apply side bets
    if (template.sideBets && template.sideBets.length > 0) {
      updateGameData('selectedSideBets', template.sideBets);
    }

    // Apply players if any exist
    if (template.players && template.players.length > 0) {
      // Clear existing results and create new ones for template players
      const newResults = template.players.map((playerId) => ({
        userId: playerId,
        position: '',
        winnings: '',
        rebuys: 0,
        rsvpStatus: 'pending',
        sideBets: [],
        // Cash game specific fields
        buyInAmount: 0,
        cashOutAmount: 0,
      }));

      // Ensure we have at least one result even if template has no players
      if (newResults.length === 0) {
        newResults.push({
          userId: '',
          position: '',
          winnings: '',
          rebuys: 0,
          rsvpStatus: 'pending',
          sideBets: [],
          // Cash game specific fields
          buyInAmount: 0,
          cashOutAmount: 0,
        });
      }

      // Update the game with the new results
      updateGameData('results', newResults);
    }
  };

  if (!showAddGame) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg max-w-4xl w-full max-h-full overflow-y-auto">
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
          {/* Template Selection - At the top for better UX */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium mb-2">
              Start with a Game Template
            </label>
            {templatesLoading && (
              <p className="text-sm text-gray-500">Loading templates...</p>
            )}
            {templatesError && (
              <p className="text-sm text-red-600">
                Error loading templates: {templatesError}
              </p>
            )}
            {!templatesLoading && !templatesError && templates.length === 0 && (
              <p className="text-sm text-gray-500">
                No game templates available. Create templates in Groups → Manage
                → Templates.
              </p>
            )}
            {templates.length > 0 && (
              <div className="space-y-2">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      const template = templates.find(
                        (t) => t.id === e.target.value
                      );
                      if (template) {
                        applyTemplate(template);
                      }
                    }
                  }}
                  className="w-full max-w-md border rounded px-4 py-3 text-base"
                  defaultValue=""
                >
                  <option value="">
                    Choose a template to pre-fill form...
                  </option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                      {template.description && ` - ${template.description}`}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">
                  Templates will pre-fill location, buy-in, max players, side
                  bets, and players
                </p>
              </div>
            )}
          </div>

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

            {/* Game Type Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Game Type *
              </label>
              <select
                value={newGame.gameType || 'tournament'}
                onChange={(e) => updateGameData('gameType', e.target.value)}
                className="w-full max-w-md border rounded px-4 py-3 text-base"
              >
                <option value="tournament">Tournament</option>
                <option value="cash">Cash Game</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {newGame.gameType === 'cash'
                  ? 'Cash games track buy-ins and cash-outs (no positions needed)'
                  : 'Tournament games track positions and payouts'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                {newGame.gameType === 'cash'
                  ? 'Default Buy-in ($)'
                  : 'Buy-in Amount ($)'}
              </label>
              <input
                type="number"
                value={newGame.buyin || 20}
                onChange={(e) =>
                  updateGameData('buyin', parseInt(e.target.value) || 20)
                }
                className="w-full max-w-md border rounded px-4 py-3 text-base"
                min="1"
                max="1000"
              />
              <p className="text-xs text-gray-500 mt-1">
                {newGame.gameType === 'cash'
                  ? 'Suggested buy-in amount (players can buy in for different amounts)'
                  : 'Tournament buy-in amount (all players pay this amount)'}
              </p>
            </div>

            {/* Cash Game specific fields */}
            {newGame.gameType === 'cash' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Min Buy-in ($)
                  </label>
                  <input
                    type="number"
                    value={newGame.minBuyIn || 20}
                    onChange={(e) =>
                      updateGameData('minBuyIn', parseInt(e.target.value) || 20)
                    }
                    className="w-full border rounded px-4 py-3 text-base"
                    min="1"
                    max="1000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Max Buy-in ($)
                  </label>
                  <input
                    type="number"
                    value={newGame.maxBuyIn || 200}
                    onChange={(e) =>
                      updateGameData(
                        'maxBuyIn',
                        parseInt(e.target.value) || 200
                      )
                    }
                    className="w-full border rounded px-4 py-3 text-base"
                    min="1"
                    max="10000"
                  />
                </div>
              </div>
            )}

            {/* House Take Configuration */}
            <div>
              <label className="block text-sm font-medium mb-2">
                House Take
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <select
                    value={newGame.houseTakeType || 'fixed'}
                    onChange={(e) =>
                      updateGameData('houseTakeType', e.target.value)
                    }
                    className="w-full border rounded px-4 py-3 text-base"
                  >
                    <option value="fixed">Fixed Amount</option>
                    <option value="percentage">Percentage</option>
                  </select>
                </div>
                <div>
                  <input
                    type="number"
                    value={newGame.houseTake || 0}
                    onChange={(e) =>
                      updateGameData(
                        'houseTake',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full border rounded px-4 py-3 text-base"
                    min="0"
                    max={newGame.houseTakeType === 'percentage' ? 100 : 1000}
                    step={newGame.houseTakeType === 'percentage' ? '0.1' : '1'}
                    placeholder={
                      newGame.houseTakeType === 'percentage' ? '0' : '0'
                    }
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {newGame.houseTakeType === 'percentage'
                  ? 'Percentage of total pot taken by house'
                  : 'Fixed dollar amount taken by house'}
              </p>
            </div>

            {/* Tournament Payout Structure */}
            {newGame.gameType === 'tournament' && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Payout Structure
                </label>
                <div className="space-y-2">
                  {(newGame.payoutStructure || []).map((payout, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-4 gap-2 items-center"
                    >
                      <div>
                        <select
                          value={payout.position}
                          onChange={(e) => {
                            const newPayouts = [
                              ...(newGame.payoutStructure || []),
                            ];
                            newPayouts[index] = {
                              ...payout,
                              position: parseInt(e.target.value),
                            };
                            updateGameData('payoutStructure', newPayouts);
                          }}
                          className="w-full border rounded px-2 py-1 text-sm"
                        >
                          {[1, 2, 3, 4, 5].map((pos) => (
                            <option key={pos} value={pos}>
                              {pos}st
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <select
                          value={payout.type}
                          onChange={(e) => {
                            const newPayouts = [
                              ...(newGame.payoutStructure || []),
                            ];
                            newPayouts[index] = {
                              ...payout,
                              type: e.target.value,
                              // Clear value for types that don't need it
                              value:
                                e.target.value === 'buyin_return' ||
                                e.target.value === 'remaining'
                                  ? 0
                                  : payout.value,
                            };
                            updateGameData('payoutStructure', newPayouts);
                          }}
                          className="w-full border rounded px-2 py-1 text-sm"
                        >
                          <option value="percentage">% of pot</option>
                          <option value="fixed">Fixed amount</option>
                          <option value="buyin_return">Buy-in back</option>
                          <option value="remaining">Remaining pot</option>
                        </select>
                      </div>
                      {payout.type !== 'buyin_return' &&
                        payout.type !== 'remaining' && (
                          <div>
                            <input
                              type="number"
                              value={payout.value}
                              onChange={(e) => {
                                const newPayouts = [
                                  ...(newGame.payoutStructure || []),
                                ];
                                newPayouts[index] = {
                                  ...payout,
                                  value: parseFloat(e.target.value) || 0,
                                };
                                updateGameData('payoutStructure', newPayouts);
                              }}
                              className="w-full border rounded px-2 py-1 text-sm"
                              min="0"
                              max={payout.type === 'percentage' ? 100 : 10000}
                              step={payout.type === 'percentage' ? '0.1' : '1'}
                            />
                          </div>
                        )}
                      {(payout.type === 'buyin_return' ||
                        payout.type === 'remaining') && (
                        <div className="text-center text-sm text-gray-500 py-2">
                          {payout.type === 'buyin_return'
                            ? 'Auto'
                            : 'Calculated'}
                        </div>
                      )}
                      <div>
                        <button
                          type="button"
                          onClick={() => {
                            const newPayouts = [
                              ...(newGame.payoutStructure || []),
                            ];
                            newPayouts.splice(index, 1);
                            updateGameData('payoutStructure', newPayouts);
                          }}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const newPayouts = [...(newGame.payoutStructure || [])];
                      newPayouts.push({
                        position: Math.max(1, newPayouts.length + 1),
                        type: 'percentage',
                        value: 0,
                      });
                      updateGameData('payoutStructure', newPayouts);
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    + Add Payout Rule
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Define how winnings are distributed to tournament finishers
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">
                Max Players
              </label>
              <input
                type="number"
                value={newGame.maxPlayers || ''}
                onChange={(e) =>
                  updateGameData(
                    'maxPlayers',
                    e.target.value ? parseInt(e.target.value) : null
                  )
                }
                className="w-full max-w-md border rounded px-4 py-3 text-base"
                min="1"
                max="50"
                placeholder="Maximum number of players"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum number of players allowed for this game.
              </p>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newGame.waitlistEnabled || false}
                  onChange={(e) =>
                    updateGameData('waitlistEnabled', e.target.checked)
                  }
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm font-medium">Enable Waitlist</span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                {newGame.waitlistEnabled
                  ? 'When max players is reached, additional players will be added to waitlist and automatically promoted when spots open up.'
                  : 'When max players is reached, additional players will be rejected (no waitlist or automatic promotion).'}
              </p>
            </div>

            {/* Side Bet Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Side Bets
              </label>
              {sideBetsLoading && (
                <p className="text-sm text-gray-500">Loading side bets...</p>
              )}
              {sideBetsError && (
                <p className="text-sm text-red-600">
                  Error loading side bets: {sideBetsError}
                </p>
              )}
              {!sideBetsLoading &&
                !sideBetsError &&
                activeSideBets.length === 0 && (
                  <p className="text-sm text-gray-500">
                    No side bets configured for this group.
                    <br />
                    Group owners can configure side bets in the Groups → Manage
                    → Side Bets section.
                  </p>
                )}
              {activeSideBets.length > 0 && (
                <div>
                  <div className="space-y-2">
                    {activeSideBets.map((sideBet) => (
                      <label key={sideBet.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={
                            newGame.selectedSideBets?.includes(sideBet.id) ||
                            false
                          }
                          onChange={(e) => {
                            const selectedSideBets =
                              newGame.selectedSideBets || [];
                            if (e.target.checked) {
                              updateGameData('selectedSideBets', [
                                ...selectedSideBets,
                                sideBet.id,
                              ]);
                            } else {
                              updateGameData(
                                'selectedSideBets',
                                selectedSideBets.filter(
                                  (id) => id !== sideBet.id
                                )
                              );
                            }
                          }}
                          className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm">
                          {sideBet.name} (${sideBet.amount})
                          {sideBet.description && (
                            <span className="text-gray-500 ml-1">
                              - {sideBet.description}
                            </span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Select which side bets to include in this game
                  </p>
                </div>
              )}
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
                  Change to "Completed" to add results and include in
                  leaderboard
                </p>
              </div>
            )}
            {!isEditing && isGameInFuture(newGame.date, newGame.time) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Future Game:</strong> This game will be created as
                  "Scheduled" for RSVP tracking. You can convert it to
                  "Completed" later to add results.
                </p>
              </div>
            )}
          </div>

          {/* Players - Only show if date is selected */}
          {newGame.date && (
            <>
              <h4 className="font-semibold mb-3">
                {(!isEditing && isGameInFuture(newGame.date, newGame.time)) ||
                (isEditing && newGame.status === 'scheduled')
                  ? 'Players & RSVP'
                  : 'Players & Results'}
              </h4>
              {newGame.results.map((result, index) => (
                <div
                  key={index}
                  className="space-y-4 mb-6 p-4 bg-gray-50 rounded-lg border"
                >
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Player *
                    </label>
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
                  <div
                    className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 ${(!isEditing && isGameInFuture(newGame.date, newGame.time)) || (isEditing && newGame.status === 'scheduled') ? 'lg:grid-cols-2' : 'lg:grid-cols-4'}`}
                  >
                    {!(
                      (!isEditing &&
                        isGameInFuture(newGame.date, newGame.time)) ||
                      (isEditing && newGame.status === 'scheduled')
                    ) && (
                      <>
                        {/* Tournament game fields */}
                        {newGame.gameType === 'tournament' && (
                          <>
                            <div>
                              <label className="block text-sm font-medium mb-2">
                                Position
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={result.position}
                                onChange={(e) =>
                                  updatePlayerResult(
                                    index,
                                    'position',
                                    e.target.value
                                  )
                                }
                                className="w-full border rounded px-3 py-2 text-base"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2">
                                Winnings ($)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={result.winnings}
                                onChange={(e) =>
                                  updatePlayerResult(
                                    index,
                                    'winnings',
                                    e.target.value
                                  )
                                }
                                className="w-full border rounded px-3 py-2 text-base"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2">
                                Rebuys
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={result.rebuys}
                                onChange={(e) =>
                                  updatePlayerResult(
                                    index,
                                    'rebuys',
                                    e.target.value
                                  )
                                }
                                className="w-full border rounded px-3 py-2 text-base"
                              />
                            </div>
                          </>
                        )}

                        {/* Cash game fields */}
                        {newGame.gameType === 'cash' && (
                          <>
                            <div>
                              <label className="block text-sm font-medium mb-2">
                                Buy-in Amount ($)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={result.buyInAmount || ''}
                                onChange={(e) =>
                                  updatePlayerResult(
                                    index,
                                    'buyInAmount',
                                    e.target.value
                                  )
                                }
                                className="w-full border rounded px-3 py-2 text-base"
                                placeholder={`Min: $${newGame.minBuyIn || 20}, Max: $${newGame.maxBuyIn || 200}`}
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2">
                                Cash-out Amount ($)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={result.cashOutAmount || ''}
                                onChange={(e) =>
                                  updatePlayerResult(
                                    index,
                                    'cashOutAmount',
                                    e.target.value
                                  )
                                }
                                className="w-full border rounded px-3 py-2 text-base"
                                placeholder="Amount player left with"
                                required
                              />
                            </div>
                          </>
                        )}
                      </>
                    )}
                    {((!isEditing &&
                      isGameInFuture(newGame.date, newGame.time)) ||
                      (isEditing && newGame.status === 'scheduled')) && (
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          RSVP Status
                        </label>
                        <select
                          value={result.rsvpStatus || 'pending'}
                          onChange={(e) =>
                            updatePlayerResult(
                              index,
                              'rsvpStatus',
                              e.target.value
                            )
                          }
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

                  {/* Side Bets - Moved outside grid to prevent overlap with Remove button */}
                  {!(
                    (!isEditing &&
                      isGameInFuture(newGame.date, newGame.time)) ||
                    (isEditing && newGame.status === 'scheduled')
                  ) &&
                    newGame.selectedSideBets?.length > 0 && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium mb-3">
                          Side Bets
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {newGame.selectedSideBets.map((sideBetId) => {
                            const sideBet = activeSideBets.find(
                              (sb) => sb.id === sideBetId
                            );
                            if (!sideBet) return null;

                            const playerSideBet = result.sideBets?.find(
                              (sb) => sb.sideBetId === sideBetId
                            ) || {
                              sideBetId,
                              name: sideBet.name,
                              amount: sideBet.amount,
                              participated: false,
                              won: false,
                            };

                            return (
                              <div
                                key={sideBetId}
                                className="border border-gray-200 rounded p-3 bg-white"
                              >
                                <div className="text-sm font-medium text-gray-700 mb-2">
                                  {sideBet.name} (${sideBet.amount})
                                </div>
                                <div className="flex space-x-4">
                                  <label className="flex items-center text-sm">
                                    <input
                                      type="checkbox"
                                      checked={playerSideBet.participated}
                                      disabled={playerSideBet.won}
                                      onChange={(e) => {
                                        // If won is checked, don't allow unchecking participated
                                        if (
                                          playerSideBet.won &&
                                          !e.target.checked
                                        ) {
                                          return;
                                        }

                                        const sideBets = result.sideBets || [];
                                        const updatedSideBets = sideBets.filter(
                                          (sb) => sb.sideBetId !== sideBetId
                                        );
                                        if (
                                          e.target.checked ||
                                          playerSideBet.won
                                        ) {
                                          updatedSideBets.push({
                                            ...playerSideBet,
                                            participated: e.target.checked,
                                          });
                                        }
                                        updatePlayerResult(
                                          index,
                                          'sideBets',
                                          updatedSideBets
                                        );
                                      }}
                                      className={`mr-2 ${playerSideBet.won ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    />
                                    Participated {playerSideBet.won}
                                  </label>
                                  <label className="flex items-center text-sm">
                                    <input
                                      type="checkbox"
                                      checked={playerSideBet.won}
                                      onChange={(e) => {
                                        const sideBets = result.sideBets || [];
                                        const updatedSideBets = sideBets.filter(
                                          (sb) => sb.sideBetId !== sideBetId
                                        );

                                        // If checking "won", automatically set participated to true
                                        // If unchecking "won", keep participated as it was
                                        const newParticipated = e.target.checked
                                          ? true
                                          : playerSideBet.participated;

                                        if (
                                          newParticipated ||
                                          e.target.checked
                                        ) {
                                          updatedSideBets.push({
                                            ...playerSideBet,
                                            participated: newParticipated,
                                            won: e.target.checked,
                                          });
                                        }
                                        updatePlayerResult(
                                          index,
                                          'sideBets',
                                          updatedSideBets
                                        );
                                      }}
                                      className="mr-2"
                                    />
                                    Won
                                  </label>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
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
