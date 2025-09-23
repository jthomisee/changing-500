// API Configuration
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'https://api.changing500.com';

// Game Configuration
// Points = Number of players you finished ahead of
// Example: 6 players, 1st place = 5 points, 2nd = 4 points, etc.

export const BEST_HAND_BET_AMOUNT = 5;

// UI Constants
export const SORT_DIRECTIONS = {
  ASC: 'asc',
  DESC: 'desc',
};

export const DEFAULT_SORT = {
  field: 'points',
  direction: SORT_DIRECTIONS.DESC,
};
