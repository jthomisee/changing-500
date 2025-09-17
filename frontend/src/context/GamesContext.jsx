import React, { createContext, useContext } from 'react';
import { useGames } from '../hooks/useGames';

const GamesContext = createContext(null);

export const GamesProvider = ({ children }) => {
  const gamesData = useGames();

  return (
    <GamesContext.Provider value={gamesData}>{children}</GamesContext.Provider>
  );
};

export const useGamesContext = () => {
  const context = useContext(GamesContext);
  if (!context) {
    throw new Error('useGamesContext must be used within a GamesProvider');
  }
  return context;
};
