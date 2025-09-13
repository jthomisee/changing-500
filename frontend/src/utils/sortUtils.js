import { SORT_DIRECTIONS } from '../constants/config';

// Sort standings with special handling for streaks and ranks
export const sortStandings = (standings, sortField, sortDirection) => {
  // First, calculate ranks based on points (always)
  const standingsWithRanks = calculateRanks(standings);
  
  // Then sort by the requested field for display
  return standingsWithRanks.sort((a, b) => {
    if (sortField === 'currentStreak') {
      return sortByStreak(a, b, sortDirection);
    }
    
    return sortByField(a, b, sortField, sortDirection);
  });
};

// Calculate traditional ranks based on points (with gaps for ties)
const calculateRanks = (standings) => {
  // Sort by points first to calculate ranks
  const pointsSorted = [...standings].sort((a, b) => b.points - a.points);
  
  let currentRank = 1;
  let previousPoints = null;
  let playersAtCurrentRank = 0;
  
  return pointsSorted.map((player, index) => {
    if (index === 0) {
      currentRank = 1;
      previousPoints = player.points;
      playersAtCurrentRank = 1;
    } else {
      if (Math.abs(player.points - previousPoints) >= 0.001) {
        // Different points - advance rank by number of tied players
        currentRank += playersAtCurrentRank;
        playersAtCurrentRank = 1;
      } else {
        // Same points - increment tied player count
        playersAtCurrentRank++;
      }
      previousPoints = player.points;
    }
    
    return { ...player, rank: currentRank };
  });
};

// Sort by streak with special logic
const sortByStreak = (a, b, sortDirection) => {
  const aStreakValue = a.streakType === 'win' ? a.currentStreak : -a.currentStreak;
  const bStreakValue = b.streakType === 'win' ? b.currentStreak : -b.currentStreak;
  
  return sortDirection === SORT_DIRECTIONS.DESC 
    ? bStreakValue - aStreakValue 
    : aStreakValue - bStreakValue;
};

// Generic field sorting
const sortByField = (a, b, field, direction) => {
  let aValue = a[field];
  let bValue = b[field];
  
  // Handle string comparison
  if (typeof aValue === 'string') {
    aValue = aValue.toLowerCase();
    bValue = bValue.toLowerCase();
  }
  
  // Handle null/undefined values
  if (aValue == null && bValue == null) return 0;
  if (aValue == null) return direction === SORT_DIRECTIONS.ASC ? -1 : 1;
  if (bValue == null) return direction === SORT_DIRECTIONS.ASC ? 1 : -1;
  
  if (direction === SORT_DIRECTIONS.ASC) {
    return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
  } else {
    return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
  }
};
