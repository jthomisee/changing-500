import { useMemo, useState } from 'react';
import { calculateSeasonStandings } from '../utils/gameUtils';
import { sortStandings } from '../utils/sortUtils';
import { DEFAULT_SORT, SORT_DIRECTIONS } from '../constants/config';

export const useStandings = (games, users = []) => {
  const [sortField, setSortField] = useState(DEFAULT_SORT.field);
  const [sortDirection, setSortDirection] = useState(DEFAULT_SORT.direction);

  // Calculate raw standings from games
  const standings = useMemo(() => {
    return calculateSeasonStandings(games, users);
  }, [games, users]);

  // Sort standings based on current sort settings
  const sortedStandings = useMemo(() => {
    return sortStandings(standings, sortField, sortDirection);
  }, [standings, sortField, sortDirection]);

  // Handle sort field change
  const handleSort = (field) => {
    if (field === sortField) {
      // Toggle direction if same field
      setSortDirection(prev => 
        prev === SORT_DIRECTIONS.ASC ? SORT_DIRECTIONS.DESC : SORT_DIRECTIONS.ASC
      );
    } else {
      // New field, use default direction
      setSortField(field);
      setSortDirection(SORT_DIRECTIONS.DESC);
    }
  };

  // Get sort icon for a field
  const getSortIcon = (field) => {
    if (sortField !== field) return 'none'; // ChevronsUpDown
    return sortDirection === SORT_DIRECTIONS.ASC ? 'asc' : 'desc'; // ChevronUp or ChevronDown
  };

  return {
    standings: sortedStandings,
    sortField,
    sortDirection,
    handleSort,
    getSortIcon
  };
};
