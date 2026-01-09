import React, { useRef, useState, useEffect, useCallback } from 'react';
import { DEFAULT_PALETTE, User, VIP_TIERS } from '../utils/appUtils'; // Import User and VIP_TIERS from appUtils

interface FreeDrawCanvasProps {
  currentUser: User;
  onBack: () => void;
  onAddLayer: (src: string, name: string) => void;
}

const FreeDrawCanvas: React.FC<FreeDrawCanvasProps> = ({ currentUser, onBack, onAddLayer }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#FFFFFF');
  const [brushSize, setBrushSize] = useState(5);
  const [isEraser, setIsEraser] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userRoleData = VIP_TIERS[currentUser.role.toUpperCase()] || VIP_TIERS.GUEST;

  useEffect(() => {
    if (userRoleData.level < VIP_TIERS.TALENT.level) {
      setError('Bạn cần cấp VIP 2 (Tài Nhân) trở lên để sử dụng tính năng này.');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set initial canvas size dynamically based on parent container or fixed ratio
    const parent = canvas.parentElement;
    if (parent) {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    } else {
      canvas.width = window.innerWidth * 0.7; // Default fallback
      canvas.height = window.innerHeight * 0.7;
    }


    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
    contextRef.current = ctx;

    // Handle window resize to adjust canvas
    const handleResize = () => {
      if (parent && canvasRef.current && contextRef.current) {
        // Store current content before resizing
        const oldImageData = contextRef.current.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);

        canvasRef.current.width = parent.clientWidth;
        canvasRef.current.height = parent.clientHeight;

        // Restore content after resizing
        contextRef.current.putImageData(oldImageData, 0, 0);

        // Reapply styles
        contextRef.current.lineCap = 'round';
        contextRef.current.lineJoin = 'round';
        ctx.strokeStyle = isEraser ? '#00000000' : brushColor; // Transparent for eraser
        ctx.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';
        ctx.lineWidth = brushSize;
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [brushColor, brushSize, isEraser, userRoleData.level]);

  // Update context when brush color/size/eraser changes
  useEffect(() => {
    if (contextRef.current) {
      contextRef.current.strokeStyle = isEraser ? '#00000000' : brushColor; // Transparent for eraser
      contextRef.current.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';
      contextRef.current.lineWidth = brushSize;
    }
  }, [brushColor, brushSize, isEraser]);

  // Helper to get coordinates for both mouse and touch events
  const getCoordinates = (event: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { offsetX: 0, offsetY: 0 };

    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;

    if (event.nativeEvent instanceof MouseEvent) {
      clientX = event.nativeEvent.clientX;
      clientY = event.nativeEvent.clientY;
    } else if (event.nativeEvent instanceof TouchEvent && event.nativeEvent.touches.length > 0) {
      clientX = event.nativeEvent.touches[0].clientX;
      clientY = event.nativeEvent.touches[0].clientY;
    } else {
      return { offsetX: 0, offsetY: 0 }; // Fallback for unexpected events
    }

    const offsetX = clientX - rect.left;
    const offsetY = clientY - rect.top;
    return { offsetX, offsetY };
  };

  const startDrawing = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    if (error) return; // Prevent drawing if there's an error (e.g., insufficient VIP level)
    const { offsetX, offsetY } = getCoordinates(event);
    contextRef.current?.beginPath();
    contextRef.current?.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  }, [error]);

  const draw = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = getCoordinates(event);
    contextRef.current?.lineTo(offsetX, offsetY);
    contextRef.current?.stroke();
  }, [isDrawing]);

  const stopDrawing = useCallback(() => {
    contextRef.current?.closePath();
    setIsDrawing(false);
  }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas && contextRef.current) {
      contextRef.current.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const saveDrawingAsLayer = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const dataURL = canvas.toDataURL('image/png');
      onAddLayer(dataURL, `Vẽ Tự Do_${Date.now()}`);
      onBack(); // Go back to editor after saving
    }
  };

  if (error) {
    return (
      <React.Fragment>
        <div className="flex flex-col items-center justify-center p-8 bg-gray-900 rounded-xl shadow-2xl w-full max-w-md border-neon-rainbow z-10">
          <h2 className="text-3xl font-bold mb-6 text-red-400 text-center">Truy cập bị hạn chế</h2>
          <p className="text-gray-300 text-center mb-6">{error}</p>
          <button onClick={onBack} className="py-2 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors">
            Quay lại
          </button>
        </div>
      </React.Fragment>
    );
  }

  return (
    <div className="flex flex-col p-4 bg-gray-900 rounded-xl shadow-2xl w-full h-full max-w-4xl border-neon-rainbow overflow-hidden">
      <h2 className="text-3xl font-bold mb-4 neon-text text-center">Vẽ Tự Do</h2>
      <div className="flex-grow relative bg-gray-800 rounded-lg overflow-hidden mb-4">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onMouseMove={draw}
          onTouchStart={startDrawing}
          onTouchEnd={stopDrawing}
          onTouchCancel={stopDrawing}
          onTouchMove={draw}
          className="w-full h-full cursor-crosshair"
          aria-label="Canvas vẽ tự do"
        />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 mb-4">
        {/* Brush Size */}
        <div className="flex items-center space-x-2">
          <label htmlFor="brush-size" className="text-gray-300 text-sm">Cỡ bút:</label>
          <input
            id="brush-size"
            type="range"
            min="1"
            max="50"
            value={brushSize}
            onChange={(e) => setBrushSize(parseInt(e.target.value))}
            className="w-24 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-blue-500 focus:ring-2"
            aria-label="Chọn cỡ bút"
          />
          <span className="text-gray-300 text-sm">{brushSize}</span>
        </div>

        {/* Brush Color */}
        <div className="flex items-center space-x-2">
          <label htmlFor="brush-color" className="text-gray-300 text-sm">Màu sắc:</label>
          <input
            id="brush-color"
            type="color"
            value={brushColor}
            onChange={(e) => {
              setBrushColor(e.target.value);
              setIsEraser(false); // Switch off eraser when selecting color
            }}
            className="w-8 h-8 rounded-full border-2 border-gray-600 cursor-pointer"
            aria-label="Chọn màu bút"
          />
        </div>

        {/* Color Palette */}
        <div className="flex flex-wrap gap-2 max-w-xs">
          {DEFAULT_PALETTE.map((color) => (
            <button
              key={color}
              className="w-6 h-6 rounded-full border border-gray-500 transition-transform duration-100 ease-in-out hover:scale-110"
              style={{ backgroundColor: color, boxShadow: brushColor === color ? '0 0 0 2px #fff, 0 0 0 4px #3B82F6' : 'none' }}
              onClick={() => { setBrushColor(color); setIsEraser(false); }}
              title={color}
              aria-label={`Chọn màu ${color}`}
            ></button>
          ))}
        </div>

        {/* Tools */}
        <div className="flex space-x-2">
          <button
            onClick={() => setIsEraser(false)}
            className={`py-2 px-4 rounded-lg font-bold transition-colors ${!isEraser ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'} text-white`}
            aria-label="Chọn công cụ bút"
          >
            Bút
          </button>
          <button
            onClick={() => setIsEraser(true)}
            className={`py-2 px-4 rounded-lg font-bold transition-colors ${isEraser ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'} text-white`}
            aria-label="Chọn công cụ tẩy"
          >
            Tẩy
          </button>
          <button
            onClick={clearCanvas}
            className="py-2 px-4 rounded-lg bg-yellow-600 hover:bg-yellow-700 text-white font-bold transition-colors"
            aria-label="Xóa toàn bộ canvas"
          >
            Xóa hết
          </button>
        </div>
      </div>

      <div className="flex justify-center space-x-4">
        <button
          onClick={saveDrawingAsLayer}
          className="py-3 px-6 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors shadow-md"
          aria-label="Lưu bản vẽ vào lớp"
        >
          Lưu vào Lớp
        </button>
        {/* Nút này đã được sửa lỗi thiếu dấu đóng và nội dung */}
        <button
          onClick={onBack}
          className="py-3 px-6 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-bold transition-colors shadow-md"
          aria-label="Quay lại"
        >
          Quay lại
        </button>
      </div>
    </div>
  );
};

export default FreeDrawCanvas;