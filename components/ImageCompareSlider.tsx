import React, { useState, useRef, useEffect, useCallback } from 'react';

interface ImageCompareSliderProps {
  imageBefore: string; // Base64 for the "Before" image
  imageAfter: string;  // Base64 for the "After" image
  width: number;
  height: number;
}

const ImageCompareSlider: React.FC<ImageCompareSliderProps> = ({
  imageBefore,
  imageAfter,
  width,
  height,
}) => {
  const [sliderPosition, setSliderPosition] = useState(50); // Percentage from left
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    let clientX: number;

    // Adjust for touch events on mobile using a type guard
    if ('touches' in e && e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
    } else {
      clientX = (e as MouseEvent).clientX; // Safely cast to MouseEvent if not a TouchEvent
    }

    const newX = clientX - containerRect.left;
    const newPosition = (newX / containerRect.width) * 100;
    setSliderPosition(Math.max(0, Math.min(100, newPosition)));
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove);
      window.addEventListener('touchend', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-lg shadow-xl"
      style={{ width: `${width}px`, height: `${height}px` }}
      aria-label="Thanh so sánh hình ảnh Before và After"
    >
      <img
        src={imageBefore}
        alt="Trước"
        className="absolute inset-0 w-full h-full object-contain"
      />
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${sliderPosition}%` }}
      >
        <img
          src={imageAfter}
          alt="Sau"
          className="absolute inset-0 w-full h-full object-contain"
          style={{ width: `${width}px`, height: `${height}px` }}
        />
      </div>
      <div
        className="absolute top-0 bottom-0 w-1 bg-white flex items-center justify-center cursor-ew-resize group"
        style={{ left: `calc(${sliderPosition}% - 2px)` }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
        aria-roledescription="Kéo để so sánh hình ảnh"
      >
        <div className="absolute w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-150">
          <svg className="w-5 h-5 text-white transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h.01M8 11h.01M8 15h.01M12 7h.01M12 11h.01M12 15h.01M16 7h.01M16 11h.01M16 15h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
      </div>
    </div>
  );
};

export default ImageCompareSlider;