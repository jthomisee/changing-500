import React, { createContext, useContext } from 'react';
import { useGroups } from '../hooks/useGroups';

const GroupsContext = createContext(null);

export const GroupsProvider = ({ children }) => {
  const groupsData = useGroups();

  return (
    <GroupsContext.Provider value={groupsData}>
      {children}
    </GroupsContext.Provider>
  );
};

export const useGroupsContext = () => {
  const context = useContext(GroupsContext);
  if (!context) {
    throw new Error('useGroupsContext must be used within a GroupsProvider');
  }
  return context;
};
