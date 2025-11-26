
import React, { useState } from 'react';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  className?: string;
  alt?: string;
}

const LazyImage: React.FC<LazyImageProps> = ({ src, className, alt, ...props }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className={`relative overflow-hidden bg-[#F0F0F0] ${className}`}>
      {/* Skeleton / Loading State */}
      {!isLoaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center animate-pulse bg-gray-200">
          <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}

      {/* Actual Image */}
      <img
        src={src}
        alt={alt || ""}
        className={`w-full h-full object-cover transition-opacity duration-500 ease-in-out ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={() => setIsLoaded(true)}
        onError={() => {
            setError(true);
            setIsLoaded(true); // Stop loading state even on error
        }}
        {...props}
      />
      
      {/* Error State */}
      {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400 text-xs">
              無法載入
          </div>
      )}
    </div>
  );
};

export default LazyImage;
