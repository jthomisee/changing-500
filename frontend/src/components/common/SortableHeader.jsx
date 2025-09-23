import React from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

const SortableHeader = ({
  field,
  children,
  align = 'text-left',
  sticky = false,
  stickyLeft = 'left-0',
  sortField,
  sortDirection,
  onSort,
}) => {
  const getSortIcon = () => {
    if (sortField !== field) return <ChevronsUpDown className="w-4 h-4" />;
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  const stickyClasses = sticky
    ? `sticky ${stickyLeft} bg-white z-10 shadow-sm border-r border-gray-200`
    : '';

  const getFlexAlignment = () => {
    if (align.includes('text-center')) return 'justify-center';
    if (align.includes('text-right')) return 'justify-end';
    return 'justify-start';
  };

  return (
    <th
      className={`px-4 py-3 cursor-pointer hover:bg-gray-50 select-none ${stickyClasses}`}
      onClick={() => onSort(field)}
    >
      <div className={`flex items-center gap-2 ${getFlexAlignment()}`}>
        <span className="font-medium text-gray-700">{children}</span>
        {getSortIcon()}
      </div>
    </th>
  );
};

export default SortableHeader;
