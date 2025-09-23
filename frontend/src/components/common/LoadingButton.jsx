import React from 'react';
import { RefreshCw } from 'lucide-react';

const LoadingButton = ({
  loading,
  children,
  className = '',
  disabled = false,
  onClick,
  ...props
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`flex items-center gap-2 ${className} disabled:opacity-50 disabled:cursor-not-allowed`}
      {...props}
    >
      {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
};

export default LoadingButton;
