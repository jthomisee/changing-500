import React, { useState } from 'react';
import { X, Users, Save, Loader, Eye, EyeOff } from 'lucide-react';
import { createGroup } from '../../services/groupService';

const GroupFormModal = ({ show, onClose, onGroupCreated }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPublic: false,
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError(''); // Clear error when user starts typing
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Group name is required');
      return;
    }

    setCreating(true);
    setError('');

    try {
      const result = await createGroup({
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        isPublic: formData.isPublic,
      });

      if (result.success) {
        // Reset form
        setFormData({
          name: '',
          description: '',
          isPublic: false,
        });
        onGroupCreated(result.group);
        onClose();
      } else {
        setError(result.error || 'Failed to create group');
      }
    } catch (err) {
      setError('Failed to create group: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    if (!creating) {
      setFormData({
        name: '',
        description: '',
        isPublic: false,
      });
      setError('');
      onClose();
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Create New Group
          </h3>
          <button
            onClick={handleClose}
            disabled={creating}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Group Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Group Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter group name"
                disabled={creating}
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  handleInputChange('description', e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional description for your group"
                rows={3}
                disabled={creating}
              />
            </div>

            {/* Public/Private Setting */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={formData.isPublic}
                    onChange={(e) =>
                      handleInputChange('isPublic', e.target.checked)
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    disabled={creating}
                  />
                  <label htmlFor="isPublic" className="ml-2 flex items-center">
                    <span className="text-sm font-medium text-gray-900">
                      Public Group
                    </span>
                    {formData.isPublic ? (
                      <Eye className="w-4 h-4 text-green-600 ml-2" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-gray-500 ml-2" />
                    )}
                  </label>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {formData.isPublic
                  ? 'Public groups can be discovered and joined by anyone'
                  : 'Private groups are invite-only'}
              </p>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex gap-3 justify-end mt-6">
            <button
              type="button"
              onClick={handleClose}
              disabled={creating}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !formData.name.trim()}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Users className="w-4 h-4" />
              )}
              {creating ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GroupFormModal;
