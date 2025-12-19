import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Users,
  Target,
  X,
  Save,
  MapPin,
  DollarSign,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  listGameTemplates,
  createGameTemplate,
  updateGameTemplate,
  deleteGameTemplate,
} from '../../services/gameTemplateService.js';
import { listGroupMembers } from '../../services/groupService.js';
import { useSideBets } from '../../hooks/useSideBets.js';

const GameTemplateManagement = ({ selectedGroup, onClose }) => {
  const { isAdmin, currentUser } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formError, setFormError] = useState('');
  const [groupMembers, setGroupMembers] = useState([]);

  const { activeSideBets, loading: sideBetsLoading } = useSideBets(
    selectedGroup?.groupId
  );

  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    location: '',
    buyin: '',
    maxPlayers: '',
    waitlistEnabled: false,
    players: [],
    sideBets: [],
    gameType: 'tournament',
    minBuyIn: '',
    maxBuyIn: '',
  });

  // Load templates
  const loadTemplates = async () => {
    if (!selectedGroup) return;

    setLoading(true);
    setError('');
    try {
      const result = await listGameTemplates(selectedGroup.groupId);
      if (result.success) {
        setTemplates(result.templates);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to load game templates');
    } finally {
      setLoading(false);
    }
  };

  // Load group members
  const loadGroupMembers = async () => {
    if (!selectedGroup) return;

    try {
      const result = await listGroupMembers(selectedGroup.groupId);
      if (result.success) {
        setGroupMembers(result.members);
      }
    } catch (err) {
      console.error('Failed to load group members:', err);
    }
  };

  useEffect(() => {
    loadTemplates();
    loadGroupMembers();
  }, [selectedGroup]);

  // Check if current user can manage templates
  const canManageTemplates = () => {
    if (isAdmin) return true;
    if (!currentUser || !selectedGroup) return false;
    return selectedGroup.userRole === 'owner';
  };

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({
      name: '',
      description: '',
      location: '',
      buyin: '',
      maxPlayers: '',
      waitlistEnabled: false,
      players: [],
      sideBets: [],
      gameType: 'tournament',
      minBuyIn: '',
      maxBuyIn: '',
    });
    setShowModal(true);
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      description: template.description || '',
      location: template.location || '',
      buyin: template.buyin || '',
      maxPlayers: template.maxPlayers || '',
      waitlistEnabled: template.waitlistEnabled || false,
      players: template.players || [],
      sideBets: template.sideBets || [],
      gameType: template.gameType || 'tournament',
      minBuyIn: template.minBuyIn || '',
      maxBuyIn: template.maxBuyIn || '',
    });
    setShowModal(true);
  };

  const handleDeleteTemplate = async (template) => {
    if (
      !window.confirm(
        `Are you sure you want to delete the template "${template.name}"?`
      )
    ) {
      return;
    }

    try {
      setError('');
      setSuccessMessage('');
      const result = await deleteGameTemplate(
        selectedGroup.groupId,
        template.id
      );
      if (result.success) {
        setSuccessMessage(`Template "${template.name}" deleted successfully`);
        loadTemplates();
      } else {
        setError(`Failed to delete template: ${result.error}`);
      }
    } catch (err) {
      setError(`Failed to delete template: ${err.message}`);
    }
  };

  const handleSaveTemplate = async (e) => {
    e.preventDefault();

    if (!templateForm.name.trim()) {
      setFormError('Template name is required');
      return;
    }

    setFormError('');
    setError('');
    setSuccessMessage('');

    try {
      const templateData = {
        name: templateForm.name.trim(),
        description: templateForm.description.trim(),
        location: templateForm.location.trim(),
        buyin: templateForm.buyin ? parseInt(templateForm.buyin) : null,
        maxPlayers: templateForm.maxPlayers
          ? parseInt(templateForm.maxPlayers)
          : null,
        waitlistEnabled: templateForm.waitlistEnabled,
        players: templateForm.players,
        sideBets: templateForm.sideBets,
        gameType: templateForm.gameType,
        minBuyIn: templateForm.minBuyIn
          ? parseInt(templateForm.minBuyIn)
          : null,
        maxBuyIn: templateForm.maxBuyIn
          ? parseInt(templateForm.maxBuyIn)
          : null,
      };

      let result;
      if (editingTemplate) {
        result = await updateGameTemplate(
          selectedGroup.groupId,
          editingTemplate.id,
          templateData
        );
      } else {
        result = await createGameTemplate(selectedGroup.groupId, templateData);
      }

      if (result.success) {
        setShowModal(false);
        setSuccessMessage(
          `Template "${templateForm.name}" ${editingTemplate ? 'updated' : 'created'} successfully`
        );
        loadTemplates();
      } else {
        setFormError(`Failed to save template: ${result.error}`);
      }
    } catch (err) {
      setFormError(`Failed to save template: ${err.message}`);
    }
  };

  const handlePlayerToggle = (userId) => {
    setTemplateForm((prev) => ({
      ...prev,
      players: prev.players.includes(userId)
        ? prev.players.filter((id) => id !== userId)
        : [...prev.players, userId],
    }));
  };

  const handleSideBetToggle = (sideBetId) => {
    setTemplateForm((prev) => ({
      ...prev,
      sideBets: prev.sideBets.includes(sideBetId)
        ? prev.sideBets.filter((id) => id !== sideBetId)
        : [...prev.sideBets, sideBetId],
    }));
  };

  const handleSelectAllPlayers = () => {
    const allPlayerIds = groupMembers.map((member) => member.userId);
    setTemplateForm((prev) => ({ ...prev, players: allPlayerIds }));
  };

  const handleSelectAllSideBets = () => {
    const allSideBetIds = activeSideBets.map((sb) => sb.id);
    setTemplateForm((prev) => ({ ...prev, sideBets: allSideBetIds }));
  };

  if (!selectedGroup) {
    return (
      <div className="text-center py-8">
        <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Select a group to manage game templates</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Target className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Game Templates</h2>
            <p className="text-gray-600">{selectedGroup.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {canManageTemplates() && (
            <button
              onClick={handleCreateTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              New Template
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Close
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Success Display */}
      {successMessage && (
        <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {successMessage}
        </div>
      )}

      {/* Templates List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading templates...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.length === 0 ? (
            <div className="text-center py-8">
              <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No game templates yet</p>
              {canManageTemplates() && (
                <button
                  onClick={handleCreateTemplate}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mx-auto"
                >
                  <Plus className="w-4 h-4" />
                  Create First Template
                </button>
              )}
            </div>
          ) : (
            templates.map((template) => (
              <div
                key={template.id}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {template.name}
                    </h3>
                    {template.description && (
                      <p className="text-gray-600 text-sm mt-1">
                        {template.description}
                      </p>
                    )}
                  </div>
                  {canManageTemplates() && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditTemplate(template)}
                        className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                        title="Edit template"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template)}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                        title="Delete template"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                  {/* Players */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">
                        Players ({template.players?.length || 0})
                      </span>
                    </div>
                    <div className="space-y-1">
                      {template.players?.length > 0 ? (
                        template.players.slice(0, 3).map((playerId) => {
                          const member = groupMembers.find(
                            (m) => m.userId === playerId
                          );
                          return member ? (
                            <div
                              key={playerId}
                              className="text-sm text-gray-600"
                            >
                              {member.firstName} {member.lastName}
                            </div>
                          ) : null;
                        })
                      ) : (
                        <div className="text-sm text-gray-500">
                          No players selected
                        </div>
                      )}
                      {template.players?.length > 3 && (
                        <div className="text-sm text-gray-500">
                          +{template.players.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Side Bets */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">
                        Side Bets ({template.sideBets?.length || 0})
                      </span>
                    </div>
                    <div className="space-y-1">
                      {template.sideBets?.length > 0 ? (
                        template.sideBets.slice(0, 3).map((sideBetId) => {
                          const sideBet = activeSideBets.find(
                            (sb) => sb.id === sideBetId
                          );
                          return sideBet ? (
                            <div
                              key={sideBetId}
                              className="text-sm text-gray-600"
                            >
                              {sideBet.name} (${sideBet.amount})
                            </div>
                          ) : null;
                        })
                      ) : (
                        <div className="text-sm text-gray-500">
                          No side bets selected
                        </div>
                      )}
                      {template.sideBets?.length > 3 && (
                        <div className="text-sm text-gray-500">
                          +{template.sideBets.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Location */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">
                        Location
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {template.location || (
                        <span className="text-gray-500">Not specified</span>
                      )}
                    </div>
                  </div>

                  {/* Buy-in */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">
                        Buy-in
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {template.buyin ? (
                        `$${template.buyin}`
                      ) : (
                        <span className="text-gray-500">Not specified</span>
                      )}
                    </div>
                  </div>

                  {/* Max Players */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">
                        Max Players
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {template.maxPlayers || (
                        <span className="text-gray-500">Not specified</span>
                      )}
                    </div>
                  </div>

                  {/* Waitlist */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">
                        Waitlist
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {template.waitlistEnabled ? (
                        <span className="text-green-600">Enabled</span>
                      ) : (
                        <span className="text-gray-500">Disabled</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Template Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingTemplate ? 'Edit Template' : 'Create New Template'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSaveTemplate}
              className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]"
            >
              {/* Form Error Display */}
              {formError && (
                <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {formError}
                </div>
              )}
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Template Name *
                    </label>
                    <input
                      type="text"
                      value={templateForm.name}
                      onChange={(e) =>
                        setTemplateForm((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., All Group Members + Side Bet A"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={templateForm.description}
                      onChange={(e) =>
                        setTemplateForm((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Optional description of this template"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Location
                      </label>
                      <input
                        type="text"
                        value={templateForm.location}
                        onChange={(e) =>
                          setTemplateForm((prev) => ({
                            ...prev,
                            location: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., Brad's House, 123 Main St, Online"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Game Type
                      </label>
                      <select
                        value={templateForm.gameType}
                        onChange={(e) =>
                          setTemplateForm((prev) => ({
                            ...prev,
                            gameType: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="tournament">Tournament</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Buy-in Amount ($)
                      </label>
                      <input
                        type="number"
                        value={templateForm.buyin}
                        onChange={(e) =>
                          setTemplateForm((prev) => ({
                            ...prev,
                            buyin: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., 20"
                        min="1"
                        max="1000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Players
                      </label>
                      <input
                        type="number"
                        value={templateForm.maxPlayers}
                        onChange={(e) =>
                          setTemplateForm((prev) => ({
                            ...prev,
                            maxPlayers: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., 8"
                        min="1"
                        max="50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={templateForm.waitlistEnabled}
                        onChange={(e) =>
                          setTemplateForm((prev) => ({
                            ...prev,
                            waitlistEnabled: e.target.checked,
                          }))
                        }
                        className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Enable Waitlist
                      </span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      When enabled, players exceeding max capacity will be added
                      to waitlist
                    </p>
                  </div>
                </div>

                {/* Players Selection */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-700">
                      Players ({templateForm.players.length} selected)
                    </label>
                    <button
                      type="button"
                      onClick={handleSelectAllPlayers}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Select All
                    </button>
                  </div>
                  <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                    {groupMembers.map((member) => (
                      <label
                        key={member.userId}
                        className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <input
                          type="checkbox"
                          checked={templateForm.players.includes(member.userId)}
                          onChange={() => handlePlayerToggle(member.userId)}
                          className="mr-3"
                        />
                        <span className="text-sm">
                          {member.firstName} {member.lastName}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Side Bets Selection */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-700">
                      Side Bets ({templateForm.sideBets.length} selected)
                    </label>
                    <button
                      type="button"
                      onClick={handleSelectAllSideBets}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Select All
                    </button>
                  </div>
                  {sideBetsLoading ? (
                    <div className="text-center py-4">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    </div>
                  ) : activeSideBets.length > 0 ? (
                    <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                      {activeSideBets.map((sideBet) => (
                        <label
                          key={sideBet.id}
                          className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <input
                            type="checkbox"
                            checked={templateForm.sideBets.includes(sideBet.id)}
                            onChange={() => handleSideBetToggle(sideBet.id)}
                            className="mr-3"
                          />
                          <span className="text-sm">
                            {sideBet.name} (${sideBet.amount})
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      No side bets available for this group
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Save className="w-4 h-4" />
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameTemplateManagement;
