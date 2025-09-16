import React from 'react';
import { FileX, Users, Calendar, Trophy, Plus } from 'lucide-react';

const EmptyState = ({
  icon: Icon = FileX,
  title,
  description,
  actionButton,
  className = ''
}) => {
  return (
    <div className={`text-center py-12 px-6 ${className}`}>
      <div className="flex justify-center mb-4">
        <Icon className="w-16 h-16 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      {description && (
        <p className="text-gray-500 mb-6 max-w-sm mx-auto">{description}</p>
      )}
      {actionButton}
    </div>
  );
};

// Specialized empty state components
export const NoGamesEmptyState = ({ groupName, onAddGame, isAuthenticated }) => (
  <EmptyState
    icon={Calendar}
    title={`No games recorded yet${groupName ? ` for ${groupName}` : ''}`}
    description={isAuthenticated ? "Add your first game to get started!" : "Games will appear here once added."}
    actionButton={isAuthenticated && onAddGame ? (
      <button
        onClick={onAddGame}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
      >
        <Plus className="w-4 h-4" />
        Add First Game
      </button>
    ) : null}
  />
);

export const NoStandingsEmptyState = ({ groupName }) => (
  <EmptyState
    icon={Trophy}
    title="No standings available"
    description={`Add some games for ${groupName || 'this group'} to see player standings!`}
  />
);

export const NoGroupsEmptyState = ({ onCreateGroup }) => (
  <EmptyState
    icon={Users}
    title="You're not a member of any groups yet"
    description="Create your first group or ask to be invited to an existing one."
    actionButton={onCreateGroup ? (
      <button
        onClick={onCreateGroup}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
      >
        <Plus className="w-4 h-4" />
        Create Your First Group
      </button>
    ) : null}
  />
);

export const SelectGroupEmptyState = () => (
  <EmptyState
    icon={Users}
    title="Select a group to view games"
    description="Choose a group from the dropdown above to see games and standings."
  />
);

export default EmptyState;