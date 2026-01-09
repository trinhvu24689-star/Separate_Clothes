import React from 'react';
import { User, VIP_TIERS } from '../utils/appUtils';
import { HistoryEntry } from '../db/schema'; // Import HistoryEntry schema

interface HistoryScreenProps {
  currentUser: User;
  onBack: () => void;
  onLoadImageFromHistory: (base64: string, name: string) => void;
}

const HistoryScreen: React.FC<HistoryScreenProps> = ({ currentUser, onBack, onLoadImageFromHistory }) => {
  const userRoleData = VIP_TIERS[currentUser.role.toUpperCase()] || VIP_TIERS.GUEST;

  const getMemoryLimit = () => {
    // Đây là một giá trị mô phỏng, trong một ứng dụng thật, nó sẽ dựa trên dữ liệu backend
    switch (userRoleData.level) {
      case VIP_TIERS.GUEST.level: return '50 MB';
      case VIP_TIERS.MEMBER.level: return '200 MB';
      case VIP_TIERS.VIP.level: return '1 GB';
      case VIP_TIERS.SSVIP.level: return '5 GB';
      case VIP_TIERS.ULTRA_INFINITY.level: return '50 GB';
      case VIP_TIERS.LIFETIME.level: return 'Vô hạn';
      default: return 'Không xác định';
    }
  };

  return (
    <div className="flex flex-col p-6 bg-gray-900 rounded-xl shadow-2xl w-full max-w-4xl h-full border-neon-rainbow overflow-hidden">
      <h2 className="text-3xl font-bold mb-4 neon-text text-center">Lịch sử</h2>
      <p className="text-center text-gray-400 text-sm mb-4">
        Các hình ảnh đã xử lý gần đây của bạn. Giới hạn bộ nhớ: <span className="text-blue-400">{getMemoryLimit()}</span>
      </p>

      {currentUser.history.length === 0 ? (
        <div className="flex-grow flex items-center justify-center text-gray-400 text-lg">
          <p>Không có hình ảnh nào trong lịch sử.</p>
        </div>
      ) : (
        <div className="flex-grow overflow-y-auto no-scrollbar grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-2">
          {currentUser.history.map((item: HistoryEntry) => ( // Cast item to HistoryEntry
            <div
              key={item.id}
              className="relative group rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-200 cursor-pointer border border-gray-700 hover:border-blue-500"
              onClick={() => onLoadImageFromHistory(item.thumbnailUrl, `Lịch sử_${new Date(item.processedAt).toLocaleString()}`)}
              aria-label={`Xem lại hình ảnh từ ${new Date(item.processedAt).toLocaleString()}`}
            >
              <img
                src={item.thumbnailUrl}
                alt={`Lịch sử ${new Date(item.processedAt).toLocaleString()}`}
                className="w-full h-32 object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <span className="text-white text-center text-sm font-semibold p-2">
                  Xem lại <br /> {new Date(item.processedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <button onClick={onBack} className="mt-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-bold transition-colors">
        Quay lại
      </button>
    </div>
  );
};

export default HistoryScreen;