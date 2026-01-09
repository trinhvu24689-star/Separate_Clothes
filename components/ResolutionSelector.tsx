import React from 'react';

interface ResolutionSelectorProps {
  selectedResolution: string;
  onSelectResolution: (resolution: string) => void;
  disabled?: boolean;
}

const resolutions = [
  { value: 'thap', label: 'Thấp (SD)' },
  { value: 'trungBinh', label: 'Trung bình (HD)' },
  { value: 'cao', label: 'Cao (Full HD)' },
  { value: '1K', label: '1K (1920x1080)' },
  { value: '2K', label: '2K (2560x1440)' },
  { value: '4K (3840x2160)' },
];

const ResolutionSelector: React.FC<ResolutionSelectorProps> = ({
  selectedResolution,
  onSelectResolution,
  disabled,
}) => {
  return (
    <div className="flex flex-col items-start space-y-2">
      <label htmlFor="resolution-select" className="text-gray-300 text-sm font-semibold">Độ phân giải xuất:</label>
      <select
        id="resolution-select"
        className="bg-gray-700 text-white p-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-150 ease-in-out"
        value={selectedResolution}
        onChange={(e) => onSelectResolution(e.target.value)}
        disabled={disabled}
        aria-label="Chọn độ phân giải xuất ảnh"
      >
        {resolutions.map((res) => (
          <option key={res.value} value={res.value}>
            {res.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ResolutionSelector;