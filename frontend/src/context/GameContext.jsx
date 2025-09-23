import React, { createContext, useContext } from 'react';

const GameContext = createContext();

export const useGameContext = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGameContext must be used within a GameProvider');
  }
  return context;
};

export const GameProvider = ({
  children,
  // Game data
  games,
  scheduledGames,
  filteredGames,
  // User and group data
  currentUser,
  selectedGroup,
  groupUsers,
  // Game management functions
  formatGameDateTime,
  getUserDisplayName,
  isGameScheduled,
  // Game actions
  startEditingGame,
  deleteGame,
  handleSendInvitations,
  handleSendResults,
  handleRSVPChange,
  // Loading states
  gamesLoading,
  sendingNotifications,
  // Auth state
  isAuthenticated,
}) => {
  const value = {
    // Game data
    games,
    scheduledGames,
    filteredGames,
    // User and group data
    currentUser,
    selectedGroup,
    groupUsers,
    // Game management functions
    formatGameDateTime,
    getUserDisplayName,
    isGameScheduled,
    // Game actions
    startEditingGame,
    deleteGame,
    handleSendInvitations,
    handleSendResults,
    handleRSVPChange,
    // Loading states
    gamesLoading,
    sendingNotifications,
    // Auth state
    isAuthenticated,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};
