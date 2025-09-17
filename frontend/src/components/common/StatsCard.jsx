import React from 'react';

const StatsCard = ({
  title,
  value,
  subtitle = null,
  icon: Icon = null,
  colorClass = 'text-gray-900',
  bgColor = 'bg-white',
  className = '',
}) => {
  return (
    <div
      className={`${bgColor} rounded-lg border border-gray-200 p-6 shadow-sm ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            {title}
          </h3>
          <div className={`mt-2 text-3xl font-bold ${colorClass}`}>{value}</div>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
        {Icon && (
          <div className="ml-4 flex-shrink-0">
            <Icon className="h-8 w-8 text-gray-400" />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsCard;
