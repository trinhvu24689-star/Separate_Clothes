import React, { useCallback, useRef, useState, useEffect } from 'react';
import { ImageLayerData } from '../types';

interface ImageLayerProps {
  layer: ImageLayerData;
  onSelect: (id: string) => void;
  onUpdate: (id: string, updates: Partial<ImageLayerData>) => void;
  isSelected: boolean;
  canvasBounds: { width: number; height: number };
}

const ROTATION_HANDLE_RADIUS = 15;
const CORNER_HANDLE_SIZE = 16;
const MIN_SIZE = 30; // Minimum size for image layers

const ImageLayer: React.FC<ImageLayerProps> = ({
  layer,
  onSelect,
  onUpdate,
  isSelected,
  canvasBounds,
}) => {
  const layerRef = useRef<HTMLImageElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const startMousePos = useRef<{ x: number; y: number } | null>(null);
  const startLayerPos = useRef<{ x: number; y: number } | null>(null);
  const startLayerSize = useRef<{ width: number; height: number } | null>(null);
  const startLayerRotation = useRef<number>(0);

  const selectLayer = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    onSelect(layer.id);
  }, [layer.id, onSelect]);

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    selectLayer(event);
    if (!layerRef.current) return;

    startMousePos.current = { x: event.clientX, y: event.clientY };
    startLayerPos.current = { x: layer.x, y: layer.y };
    setIsDragging(true);
  }, [layer.x, layer.y, selectLayer]);

  const handleResizeStart = useCallback((event: React.MouseEvent, corner: 'tl' | 'tr' | 'bl' | 'br') => {
    event.stopPropagation();
    selectLayer(event);
    if (!layerRef.current) return;

    startMousePos.current = { x: event.clientX, y: event.clientY };
    startLayerSize.current = { width: layer.width, height: layer.height };
    startLayerPos.current = { x: layer.x, y: layer.y }; // Need to track layer pos for top-left resize
    setIsResizing(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!startMousePos.current || !startLayerSize.current || !startLayerPos.current) return;

      const deltaX = moveEvent.clientX - startMousePos.current.x;
      const deltaY = moveEvent.clientY - startMousePos.current.y;

      let newWidth = startLayerSize.current.width;
      let newHeight = startLayerSize.current.height;
      let newX = startLayerPos.current.x;
      let newY = startLayerPos.current.y;

      const ratio = startLayerSize.current.width / startLayerSize.current.height;

      switch (corner) {
        case 'br':
          newWidth = Math.max(MIN_SIZE, startLayerSize.current.width + deltaX);
          newHeight = Math.max(MIN_SIZE, startLayerSize.current.height + deltaY);
          break;
        case 'bl':
          newWidth = Math.max(MIN_SIZE, startLayerSize.current.width - deltaX);
          newHeight = Math.max(MIN_SIZE, startLayerSize.current.height + deltaY);
          newX = startLayerPos.current.x + deltaX;
          break;
        case 'tr':
          newWidth = Math.max(MIN_SIZE, startLayerSize.current.width + deltaX);
          newHeight = Math.max(MIN_SIZE, startLayerSize.current.height - deltaY);
          newY = startLayerPos.current.y + deltaY;
          break;
        case 'tl':
          newWidth = Math.max(MIN_SIZE, startLayerSize.current.width - deltaX);
          newHeight = Math.max(MIN_SIZE, startLayerSize.current.height - deltaY);
          newX = startLayerPos.current.x + deltaX;
          newY = startLayerPos.current.y + deltaY;
          break;
      }

      // Maintain aspect ratio if Shift key is pressed or if it's not a top-left resize (to simplify)
      // For simplicity, let's keep aspect ratio for all corners during mouse drag
      if (moveEvent.shiftKey) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          newHeight = newWidth / ratio;
        } else {
          newWidth = newHeight * ratio;
        }
      }

      // Ensure minimum size
      if (newWidth < MIN_SIZE) {
        newWidth = MIN_SIZE;
        if (moveEvent.shiftKey) newHeight = newWidth / ratio;
      }
      if (newHeight < MIN_SIZE) {
        newHeight = MIN_SIZE;
        if (moveEvent.shiftKey) newWidth = newHeight * ratio;
      }

      onUpdate(layer.id, {
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      startMousePos.current = null;
      startLayerSize.current = null;
      startLayerPos.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [layer.id, layer.x, layer.y, layer.width, layer.height, onUpdate, selectLayer]);


  const handleRotateStart = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    selectLayer(event);
    if (!layerRef.current) return;

    startMousePos.current = { x: event.clientX, y: event.clientY };
    startLayerRotation.current = layer.rotation;
    setIsRotating(true);

    const layerRect = layerRef.current.getBoundingClientRect();
    const layerCenterX = layerRect.left + layerRect.width / 2;
    const layerCenterY = layerRect.top + layerRect.height / 2;

    const getAngle = (cx: number, cy: number, mx: number, my: number) => {
      const angle = Math.atan2(my - cy, mx - cx) * (180 / Math.PI);
      return angle < 0 ? angle + 360 : angle; // Ensure positive angle
    };

    const initialAngle = getAngle(layerCenterX, layerCenterY, event.clientX, event.clientY);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const currentAngle = getAngle(layerCenterX, layerCenterY, moveEvent.clientX, moveEvent.clientY);
      let newRotation = startLayerRotation.current + (currentAngle - initialAngle);

      // Snap to 45 degree increments if Shift is held
      if (moveEvent.shiftKey) {
        newRotation = Math.round(newRotation / 45) * 45;
      }

      onUpdate(layer.id, { rotation: newRotation });
    };

    const handleMouseUp = () => {
      setIsRotating(false);
      startMousePos.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }, [layer.id, layer.rotation, onUpdate, selectLayer]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging || !startMousePos.current || !startLayerPos.current) return;

      const deltaX = event.clientX - startMousePos.current.x;
      const deltaY = event.clientY - startMousePos.current.y;

      // Calculate new position, clamping to canvas bounds
      const newX = Math.max(0, Math.min(canvasBounds.width - layer.width, startLayerPos.current.x + deltaX));
      const newY = Math.max(0, Math.min(canvasBounds.height - layer.height, startLayerPos.current.y + deltaY));

      onUpdate(layer.id, { x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      startMousePos.current = null;
      startLayerPos.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, layer.id, layer.width, layer.height, canvasBounds.width, canvasBounds.height, onUpdate]);

  return (
    <div
      ref={layerRef}
      className={`absolute cursor-grab transition-all duration-100 ease-out will-change-transform
        ${isSelected ? 'shadow-lg border-2 border-blue-500 z-50' : ''}
        ${isDragging || isResizing || isRotating ? 'cursor-grabbing' : ''}
      `}
      style={{
        left: layer.x,
        top: layer.y,
        width: layer.width,
        height: layer.height,
        zIndex: layer.zIndex,
        transform: `rotate(${layer.rotation}deg)`,
        opacity: layer.opacity,
        transformOrigin: 'center center', // Ensure rotation is from the center
      }}
      onMouseDown={handleMouseDown}
      onClick={selectLayer}
    >
      <img
        src={layer.src}
        alt={layer.name}
        className="w-full h-full object-contain pointer-events-none select-none"
        draggable="false"
      />

      {isSelected && (
        <>
          {/* Resize Handles */}
          {['tl', 'tr', 'bl', 'br'].map((corner) => (
            <div
              key={corner}
              className={`absolute w-4 h-4 bg-blue-500 border border-blue-800 rounded-full cursor-nwse transform -translate-x-1/2 -translate-y-1/2 z-50
                ${corner === 'tl' && 'top-0 left-0'}
                ${corner === 'tr' && 'top-0 right-0'}
                ${corner === 'bl' && 'bottom-0 left-0'}
                ${corner === 'br' && 'bottom-0 right-0'}
              `}
              style={{
                cursor: corner === 'tl' || corner === 'br' ? 'nwse-resize' : 'nesw-resize',
                width: CORNER_HANDLE_SIZE,
                height: CORNER_HANDLE_SIZE,
                // Adjust position based on size and current rotation for accurate hit area
              }}
              onMouseDown={(e) => handleResizeStart(e, corner as 'tl' | 'tr' | 'bl' | 'br')}
            />
          ))}

          {/* Rotation Handle */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full w-8 h-8 flex items-center justify-center cursor-grab-rotate"
            style={{
              marginTop: `-${ROTATION_HANDLE_RADIUS + 10}px`,
              cursor: 'grab', // Custom cursor if possible for rotation
            }}
            onMouseDown={handleRotateStart}
          >
            <svg
              className="w-5 h-5 text-blue-500 hover:text-blue-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 4v5h.582m15.356-2A8.001 8.001 0 004 12c0 2.21.815 4.209 2.156 5.714m0 0l-1.551 1.552v-2.003h2.003L13.91 10.74l3.753 3.753m-1.502-1.503h2.003v-2.003l-1.551-1.552z"
              ></path>
            </svg>
          </div>
        </>
      )}
    </div>
  );
};

export default ImageLayer;