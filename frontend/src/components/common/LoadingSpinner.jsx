import React from 'react';
import { Loader } from 'lucide-react';

const LoadingSpinner = ({
  size = 'medium',
  message = 'Loading...',
  className = '',
  showMessage = true,
  centered = false
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
    xlarge: 'w-16 h-16'
  };

  const containerClasses = centered
    ? 'flex flex-col items-center justify-center gap-3'
    : 'flex items-center gap-3';

  return (
    <div className={`${containerClasses} ${className}`}>
      <Loader className={`${sizeClasses[size]} animate-spin text-blue-600`} />
      {showMessage && (
        <div className="text-gray-500 text-sm">{message}</div>
      )}
    </div>
  );
};

// Specialized loading components for common use cases
export const TableLoadingState = ({ message = 'Loading...', colSpan = 10 }) => (
  <tr>
    <td colSpan={colSpan} className="px-6 py-12 text-center">
      <LoadingSpinner message={message} centered />
    </td>
  </tr>
);

export const CardLoadingState = ({ message = 'Loading...' }) => (
  <div className="px-6 py-12 text-center">
    <LoadingSpinner message={message} centered />
  </div>
);

export const PageLoadingState = ({ message = 'Loading page...' }) => (
  <div className="min-h-screen flex items-center justify-center">
    <LoadingSpinner size="large" message={message} centered />
  </div>
);

export const InlineLoadingState = ({ message = 'Loading...' }) => (
  <LoadingSpinner size="small" message={message} showMessage={false} />
);

export default LoadingSpinner;