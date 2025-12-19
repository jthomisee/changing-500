import React, { useState } from 'react';
import { useSideBets } from '../../hooks/useSideBets';
import LoadingSpinner from '../common/LoadingSpinner.jsx';

export const SideBetManagement = ({ groupId, groupRole }) => {
  const {
    sideBets,
    loading,
    error,
    createSideBet,
    updateSideBet,
    deleteSideBet,
    clearError,
  } = useSideBets(groupId);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSideBet, setEditingSideBet] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    amount: '',
    defaultTimesParticipated: '',
  });
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Check if user can manage side bets (only owners)
  const canManage = groupRole === 'owner';

  // Reset form
  const resetForm = () => {
    setFormData({ name: '', description: '', amount: '' });
    setFormError('');
    setShowAddForm(false);
    setEditingSideBet(null);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setFormError('Side bet name is required');
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setFormError('Amount must be greater than 0');
      return;
    }

    if (
      formData.defaultTimesParticipated !== '' &&
      (!Number.isInteger(parseInt(formData.defaultTimesParticipated)) ||
        parseInt(formData.defaultTimesParticipated) < 0)
    ) {
      setFormError('Default times participated must be an integer >= 0');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      let result;

      if (editingSideBet) {
        result = await updateSideBet(editingSideBet.id, {
          name: formData.name,
          description: formData.description,
          amount: parseFloat(formData.amount),
          defaultTimesParticipated:
            formData.defaultTimesParticipated !== ''
              ? parseInt(formData.defaultTimesParticipated)
              : undefined,
        });
      } else {
        result = await createSideBet({
          name: formData.name,
          description: formData.description,
          amount: parseFloat(formData.amount),
          defaultTimesParticipated:
            formData.defaultTimesParticipated !== ''
              ? parseInt(formData.defaultTimesParticipated)
              : undefined,
        });
      }

      if (result.success) {
        resetForm();
      } else {
        setFormError(result.error);
      }
    } catch (err) {
      setFormError(err.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle edit
  const handleEdit = (sideBet) => {
    setEditingSideBet(sideBet);
    setFormData({
      name: sideBet.name,
      description: sideBet.description || '',
      amount: sideBet.amount.toString(),
      defaultTimesParticipated:
        sideBet.defaultTimesParticipated !== undefined
          ? String(sideBet.defaultTimesParticipated)
          : '',
    });
    setShowAddForm(true);
    setFormError('');
  };

  // Handle delete
  const handleDelete = async (sideBet) => {
    if (!window.confirm(`Are you sure you want to delete "${sideBet.name}"?`)) {
      return;
    }

    setFormError('');
    setSuccessMessage('');
    const result = await deleteSideBet(sideBet.id);
    if (result.success) {
      setSuccessMessage(`Side bet "${sideBet.name}" deleted successfully`);
    } else {
      setFormError(`Failed to delete side bet: ${result.error}`);
    }
  };

  // Handle toggle active status
  const handleToggleActive = async (sideBet) => {
    setFormError('');
    setSuccessMessage('');
    const result = await updateSideBet(sideBet.id, {
      isActive: !sideBet.isActive,
    });

    if (result.success) {
      setSuccessMessage(
        `Side bet "${sideBet.name}" ${!sideBet.isActive ? 'activated' : 'deactivated'} successfully`
      );
    } else {
      setFormError(`Failed to update side bet: ${result.error}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="medium" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Side Bets</h3>
          <p className="text-sm text-gray-600">
            Configure side bets that can be added to games
          </p>
        </div>
        {canManage && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Add Side Bet
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={clearError}
                  className="text-sm bg-red-100 px-2 py-1 rounded text-red-800 hover:bg-red-200"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Form */}
      {showAddForm && canManage && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">
            {editingSideBet ? 'Edit Side Bet' : 'Add New Side Bet'}
          </h4>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700"
              >
                Name *
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Best Hand, High Card, etc."
                required
              />
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700"
              >
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Optional description of the side bet rules..."
              />
            </div>

            {/* Amount */}
            <div>
              <label
                htmlFor="amount"
                className="block text-sm font-medium text-gray-700"
              >
                Amount per Person *
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  id="amount"
                  step="0.01"
                  min="0.01"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  className="block w-full pl-7 pr-12 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="5.00"
                  required
                />
              </div>

              {/* Default Times Participated */}
              <div>
                <label
                  htmlFor="defaultTimesParticipated"
                  className="block text-sm font-medium text-gray-700"
                >
                  Default Times Participated
                </label>
                <input
                  type="number"
                  id="defaultTimesParticipated"
                  min="0"
                  value={formData.defaultTimesParticipated}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      defaultTimesParticipated: e.target.value,
                    })
                  }
                  className="mt-1 block w-32 border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional default times a participant is counted for this side
                  bet when applied to games.
                </p>
              </div>
            </div>

            {/* Form Error */}
            {formError && (
              <div className="text-red-600 text-sm">{formError}</div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="text-green-600 text-sm">{successMessage}</div>
            )}

            {/* Buttons */}
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting
                  ? 'Saving...'
                  : editingSideBet
                    ? 'Update'
                    : 'Create'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Side Bets List */}
      <div className="bg-white shadow rounded-lg">
        {sideBets.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No side bets
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {canManage
                ? 'Get started by creating your first side bet.'
                : 'No side bets have been configured for this group.'}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  {canManage && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sideBets.map((sideBet) => (
                  <tr
                    key={sideBet.id}
                    className={sideBet.isActive === false ? 'opacity-60' : ''}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {sideBet.name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500">
                        {sideBet.description || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        ${sideBet.amount}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          sideBet.isActive === false
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {sideBet.isActive === false ? 'Inactive' : 'Active'}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(sideBet)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleActive(sideBet)}
                            className="text-yellow-600 hover:text-yellow-900"
                          >
                            {sideBet.isActive === false
                              ? 'Activate'
                              : 'Deactivate'}
                          </button>
                          <button
                            onClick={() => handleDelete(sideBet)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
