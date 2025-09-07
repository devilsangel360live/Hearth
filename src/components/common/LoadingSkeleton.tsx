import React from 'react';

interface LoadingSkeletonProps {
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
  lines = 1,
}) => {
  const baseClasses = 'animate-pulse bg-gray-200 dark:bg-gray-700';
  
  const variantClasses = {
    text: 'h-4 rounded',
    rectangular: 'rounded-lg',
    circular: 'rounded-full',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  if (variant === 'text' && lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`${baseClasses} ${variantClasses[variant]} ${
              index === lines - 1 ? 'w-3/4' : 'w-full'
            }`}
            style={index === 0 ? style : {}}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
};

export const RecipeCardSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden animate-fade-in">
    <LoadingSkeleton variant="rectangular" className="w-full h-48" />
    <div className="p-4 space-y-3">
      <LoadingSkeleton variant="text" lines={2} />
      <div className="flex items-center space-x-4">
        <LoadingSkeleton variant="text" width={60} />
        <LoadingSkeleton variant="text" width={80} />
      </div>
      <div className="flex flex-wrap gap-2">
        <LoadingSkeleton variant="rectangular" width={60} height={24} className="rounded-full" />
        <LoadingSkeleton variant="rectangular" width={80} height={24} className="rounded-full" />
        <LoadingSkeleton variant="rectangular" width={70} height={24} className="rounded-full" />
      </div>
    </div>
  </div>
);

export const RecipeDetailSkeleton: React.FC = () => (
  <div className="max-w-4xl mx-auto p-4 space-y-6 animate-fade-in">
    <LoadingSkeleton variant="rectangular" className="w-full h-64 md:h-96 rounded-xl" />
    
    <div className="space-y-4">
      <LoadingSkeleton variant="text" className="h-8" lines={2} />
      
      <div className="flex items-center space-x-6">
        <LoadingSkeleton variant="text" width={100} />
        <LoadingSkeleton variant="text" width={120} />
        <LoadingSkeleton variant="text" width={90} />
      </div>
      
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <LoadingSkeleton 
            key={index}
            variant="rectangular" 
            width={80} 
            height={28} 
            className="rounded-full" 
          />
        ))}
      </div>
    </div>

    <div className="grid md:grid-cols-2 gap-8">
      <div className="space-y-4">
        <LoadingSkeleton variant="text" className="h-6 w-32" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <LoadingSkeleton key={index} variant="text" />
          ))}
        </div>
      </div>
      
      <div className="space-y-4">
        <LoadingSkeleton variant="text" className="h-6 w-32" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <LoadingSkeleton variant="text" className="h-4 w-16" />
              <LoadingSkeleton variant="text" lines={2} />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);