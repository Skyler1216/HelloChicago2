import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'white' | 'coral' | 'gray';
  text?: string;
  className?: string;
}

export default function LoadingSpinner({
  size = 'md',
  color = 'coral',
  text,
  className = '',
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const colorClasses = {
    white: 'text-white',
    coral: 'text-coral-500',
    gray: 'text-gray-500',
  };

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <Loader2
        className={`${sizeClasses[size]} ${colorClasses[color]} animate-spin`}
        role="status"
        aria-label="Loading"
      />
      {text && (
        <span className="text-sm text-gray-600 animate-pulse">{text}</span>
      )}
    </div>
  );
}
