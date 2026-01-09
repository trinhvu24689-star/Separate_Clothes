import React from 'react';
import { ImageLayerData } from '../types';

interface LayerSidebarProps {
  layers: ImageLayerData[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string) => void;
  onUpdateLayer: (id: string, updates: Partial<ImageLayerData>) => void;
  onDeleteLayer: (id: string) => void;
  onLayerOrderChange: (id: string, direction: 'up' | 'down') => void;
  onClearAllLayers: () => void;
}

const LayerSidebar: React.FC<LayerSidebarProps> = ({
  layers,
  selectedLayerId,
  onSelectLayer,
  onUpdateLayer,
  onDeleteLayer,
  onLayerOrderChange,
  onClearAllLayers,
}) => {
  const selectedLayer = layers.find((layer) => layer.id === selectedLayerId);

  return (
    <div className="bg-gray-800 p-4 w-64 flex flex-col h-full shadow-lg">
      <h2 className="text-xl font-bold mb-4 text-white">Layers</h2>

      <div className="flex-grow overflow-y-auto no-scrollbar mb-4 pr-2">
        {layers.length === 0 ? (
          <p className="text-gray-400 text-sm">No layers yet. Upload an image to start!</p>
        ) : (
          <ul className="space-y-2">
            {[...layers]
              .sort((a, b) => b.zIndex - a.zIndex) // Display higher zIndex first
              .map((layer) => (
                <li
                  key={layer.id}
                  className={`bg-gray-700 p-2 rounded-lg flex items-center justify-between transition-all duration-150 ease-in-out
                    ${selectedLayerId === layer.id ? 'border-2 border-blue-500 shadow-md' : 'border border-gray-600'}
                    hover:bg-gray-600 cursor-pointer`}
                  onClick={() => onSelectLayer(layer.id)}
                >
                  <div className="flex items-center space-x-2 flex-grow min-w-0">
                    <img
                      src={layer.src}
                      alt={layer.name}
                      className="w-8 h-8 object-cover rounded-sm flex-shrink-0"
                    />
                    <span className="text-gray-200 text-sm truncate">{layer.name}</span>
                  </div>
                  <div className="flex space-x-1 ml-2 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onLayerOrderChange(layer.id, 'up');
                      }}
                      className="p-1 rounded bg-gray-600 hover:bg-gray-500 text-gray-300 transition-colors duration-150"
                      title="Bring Forward"
                      aria-label="Bring layer forward"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path></svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onLayerOrderChange(layer.id, 'down');
                      }}
                      className="p-1 rounded bg-gray-600 hover:bg-gray-500 text-gray-300 transition-colors duration-150"
                      title="Send Backward"
                      aria-label="Send layer backward"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteLayer(layer.id);
                      }}
                      className="p-1 rounded bg-red-600 hover:bg-red-500 text-white transition-colors duration-150"
                      title="Delete Layer"
                      aria-label="Delete layer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </div>

      {selectedLayer && (
        <div className="bg-gray-700 p-3 rounded-lg shadow-inner mb-4">
          <h3 className="text-lg font-semibold text-white mb-2">
            Properties: <span className="text-blue-400 truncate">{selectedLayer.name}</span>
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="prop-x" className="text-gray-300 text-sm">X Position:</label>
              <input
                id="prop-x"
                type="number"
                value={Math.round(selectedLayer.x)}
                onChange={(e) => onUpdateLayer(selectedLayer.id, { x: parseFloat(e.target.value) })}
                className="w-24 bg-gray-800 text-white text-sm p-1 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-center justify-between">
              <label htmlFor="prop-y" className="text-gray-300 text-sm">Y Position:</label>
              <input
                id="prop-y"
                type="number"
                value={Math.round(selectedLayer.y)}
                onChange={(e) => onUpdateLayer(selectedLayer.id, { y: parseFloat(e.target.value) })}
                className="w-24 bg-gray-800 text-white text-sm p-1 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-center justify-between">
              <label htmlFor="prop-width" className="text-gray-300 text-sm">Width:</label>
              <input
                id="prop-width"
                type="number"
                value={Math.round(selectedLayer.width)}
                onChange={(e) => onUpdateLayer(selectedLayer.id, { width: parseFloat(e.target.value) })}
                className="w-24 bg-gray-800 text-white text-sm p-1 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-center justify-between">
              <label htmlFor="prop-height" className="text-gray-300 text-sm">Height:</label>
              <input
                id="prop-height"
                type="number"
                value={Math.round(selectedLayer.height)}
                onChange={(e) => onUpdateLayer(selectedLayer.id, { height: parseFloat(e.target.value) })}
                className="w-24 bg-gray-800 text-white text-sm p-1 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-center justify-between">
              <label htmlFor="prop-rotation" className="text-gray-300 text-sm">Rotation:</label>
              <input
                id="prop-rotation"
                type="number"
                value={Math.round(selectedLayer.rotation)}
                onChange={(e) => onUpdateLayer(selectedLayer.id, { rotation: parseFloat(e.target.value) })}
                className="w-24 bg-gray-800 text-white text-sm p-1 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-center justify-between">
              <label htmlFor="prop-opacity" className="text-gray-300 text-sm">Opacity:</label>
              <input
                id="prop-opacity"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={selectedLayer.opacity}
                onChange={(e) => onUpdateLayer(selectedLayer.id, { opacity: parseFloat(e.target.value) })}
                className="w-24 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-blue-500 focus:ring-2"
              />
              <span className="text-gray-300 text-sm ml-2">{(selectedLayer.opacity * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={onClearAllLayers}
        className="w-full py-2 px-4 bg-red-700 text-white rounded-lg hover:bg-red-600 transition-colors duration-150 ease-in-out shadow-md
          focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75"
        disabled={layers.length === 0}
        title="Clear all layers from the canvas"
        aria-label="Clear all layers"
      >
        Clear All Layers
      </button>
    </div>
  );
};

export default LayerSidebar;