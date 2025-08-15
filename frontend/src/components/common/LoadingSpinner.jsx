// frontend/src/components/common/LoadingSpinner.jsx
import React from 'react';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

const LoadingSpinner = ({ 
  size = 'md', 
  color = 'primary', 
  text,
  className,
  ...props 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  const colorClasses = {
    primary: 'text-primary-600',
    white: 'text-white',
    gray: 'text-gray-400',
    success: 'text-success-600',
    warning: 'text-warning-600',
    danger: 'text-danger-600',
  };

  return (
    <div 
      className={clsx(
        'flex items-center justify-center',
        className
      )}
      {...props}
    >
      <div className="flex flex-col items-center space-y-2">
        <Loader2 
          className={clsx(
            'animate-spin',
            sizeClasses[size],
            colorClasses[color]
          )}
        />
        {text && (
          <p className="text-sm text-gray-600 animate-pulse">
            {text}
          </p>
        )}
      </div>
    </div>
  );
};

// Inline spinner for buttons
export const InlineSpinner = ({ size = 'sm', className }) => (
  <Loader2 
    className={clsx(
      'animate-spin',
      {
        'w-3 h-3': size === 'xs',
        'w-4 h-4': size === 'sm',
        'w-5 h-5': size === 'md',
      },
      className
    )}
  />
);

// Full page loading overlay
export const LoadingOverlay = ({ text = 'Loading...' }) => (
  <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center space-y-4">
      <LoadingSpinner size="lg" />
      <p className="text-gray-600 font-medium">{text}</p>
    </div>
  </div>
);

// Skeleton loader for content
export const SkeletonLoader = ({ className, ...props }) => (
  <div 
    className={clsx(
      'animate-pulse bg-gray-200 rounded',
      className
    )}
    {...props}
  />
);

// Card skeleton
export const CardSkeleton = () => (
  <div className="card p-4 space-y-3">
    <SkeletonLoader className="h-4 w-3/4" />
    <SkeletonLoader className="h-3 w-1/2" />
    <SkeletonLoader className="h-3 w-2/3" />
  </div>
);

// Table skeleton
export const TableSkeleton = ({ rows = 5, columns = 4 }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, index) => (
      <div key={index} className="flex space-x-4">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <SkeletonLoader 
            key={colIndex} 
            className="h-4 flex-1" 
          />
        ))}
      </div>
    ))}
  </div>
);

export default LoadingSpinner;