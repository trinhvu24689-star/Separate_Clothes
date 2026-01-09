import React, { useState, useEffect } from 'react';
import { User, VIP_TIERS } from '../utils/appUtils';
import { fileToBase64 } from '../utils/imageUtils';
import * as userService from '../services/user';
import { Frame } from '../db/schema'; // Import Frame schema

interface ProfileScreenProps {
  currentUser: User;
  onBack: () => void;
  onShowMessage: (message: string, isError: boolean) => void;
  onUpdateCurrentUser: (user: User) => void; // Callback to update currentUser in App.tsx
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ currentUser, onBack, onShowMessage, onUpdateCurrentUser }) => {
  const [editingAvatar, setEditingAvatar] = useState(false);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const [selectedFrameId, setSelectedFrameId] = useState(currentUser.frameId);
  const [availableFrames, setAvailableFrames] = useState<Frame[]>([]);
  const [loadingFrames, setLoadingFrames] = useState(true);

  const userRoleData = VIP_TIERS[currentUser.role.toUpperCase()] || VIP_TIERS.GUEST;

  // Fetch frames on component mount
  useEffect(() => {
    const loadFrames = async () => {
      setLoadingFrames(true);
      try {
        const fetchedFrames = await userService.fetchFrames();
        // Filter frames based on user's VIP level
        const filteredFrames = fetchedFrames.filter(frame => userRoleData.level >= frame.minLevel);
        setAvailableFrames(filteredFrames);
      } catch (err) {
        console.error('Error fetching frames:', err);
        onShowMessage('Lỗi khi tải danh sách khung.', true);
      } finally {
        setLoadingFrames(false);
      }
    };
    loadFrames();
  }, [currentUser.role, onShowMessage, userRoleData.level]);

  // Sync selectedFrameId with currentUser.frameId if it changes externally
  useEffect(() => {
    setSelectedFrameId(currentUser.frameId);
  }, [currentUser.frameId]);


  const handleAvatarFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAvatar = async () => {
    if (selectedAvatarFile && currentUser.id) {
      try {
        const base64Avatar = await fileToBase64(selectedAvatarFile);
        const updatedUser = await userService.updateProfile(currentUser.id, { avatarUrl: base64Avatar });
        if (updatedUser) {
          onUpdateCurrentUser(updatedUser); // Update parent state
          onShowMessage('Cập nhật avatar thành công!', false);
          setEditingAvatar(false);
          setSelectedAvatarFile(null);
          setPreviewAvatar(null);
        } else {
          onShowMessage('Lỗi khi cập nhật avatar.', true);
        }
      } catch (error) {
        onShowMessage('Lỗi khi cập nhật avatar.', true);
        console.error('Error updating avatar:', error);
      }
    }
  };

  const handleSaveFrame = async () => {
    if (currentUser.id) {
      try {
        const updatedUser = await userService.updateProfile(currentUser.id, { frameId: selectedFrameId });
        if (updatedUser) {
          onUpdateCurrentUser(updatedUser); // Update parent state
          onShowMessage('Cập nhật khung avatar thành công!', false);
        } else {
          onShowMessage('Lỗi khi cập nhật khung avatar.', true);
        }
      } catch (error) {
        onShowMessage('Lỗi khi cập nhật khung avatar.', true);
        console.error('Error updating frame:', error);
      }
    }
  };

  const getFrameStyle = (frameId: string) => {
    // In a real app, you might fetch frame details from `availableFrames` for dynamic styling
    // For now, these are hardcoded examples matching some seeded frame names
    switch (frameId) {
      case 'gold': return 'border-4 border-yellow-500 shadow-lg'; // Example for 'Vàng Huy Hoàng' (if ID matches 'gold')
      case 'silver': return 'border-4 border-gray-400 shadow-md'; // Example for 'Bạc Tinh Xảo'
      case 'diamond': return 'border-4 border-blue-300 shadow-xl'; // Example for 'Kim Cương Bất Diệt'
      case 'dragon': return 'border-4 border-red-600 shadow-2xl'; // Example for 'Phượng Rồng'
      case 'phoenix': return 'border-4 border-orange-500 shadow-2xl animate-pulse'; // Example for 'Phượng Hoàng'
      case 'heaven': return 'border-4 border-sky-400 shadow-lg'; // Example for 'Thiên Thượng'
      case 'Admin Gold': return 'border-4 border-yellow-700 shadow-2xl'; // Specific style for admin frame
      default: return 'border-2 border-blue-500'; // Default for 'Mặc định' or unknown
    }
  };

  const currentFrameName = availableFrames.find(f => f.id === currentUser.frameId)?.name || 'Mặc định';

  return (
    <div className="flex flex-col p-6 bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl border-neon-rainbow overflow-y-auto no-scrollbar">
      <h2 className="text-3xl font-bold mb-6 neon-text text-center">Hồ sơ của bạn</h2>

      {/* Profile Info */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-inner mb-6 flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
        <div className="relative flex-shrink-0">
          <img
            src={previewAvatar || currentUser.avatarUrl}
            alt="Avatar"
            className={`w-24 h-24 rounded-full object-cover ${getFrameStyle(currentUser.frameId)}`}
          />
          <button
            onClick={() => setEditingAvatar(true)}
            className="absolute -bottom-2 -right-2 bg-blue-600 rounded-full p-2 text-white hover:bg-blue-700 transition-colors"
            title="Thay đổi ảnh đại diện"
            aria-label="Thay đổi ảnh đại diện"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          </button>
        </div>
        <div className="flex-grow text-center md:text-left">
          <p className="text-xl font-bold text-white mb-1">{currentUser.username}</p>
          <p className="text-md text-gray-300">Cấp: <span className="neon-text font-bold">{userRoleData.name}</span></p>
          <p className="text-md text-gray-300">Sao: <span className="text-yellow-400 font-bold">{currentUser.stars}</span></p>
          <p className="text-md text-gray-300">Khung hiện tại: <span className="text-blue-400">{currentFrameName}</span></p>
        </div>
      </div>

      {/* Avatar Editor Modal */}
      {editingAvatar && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-8 rounded-xl shadow-2xl w-full max-w-sm border-neon-rainbow relative">
            <h3 className="text-xl font-bold neon-text mb-4">Thay đổi ảnh đại diện</h3>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarFileChange}
              className="mb-4 w-full text-gray-300 bg-gray-800 p-2 rounded-lg"
              aria-label="Chọn tệp ảnh đại diện"
            />
            {previewAvatar && (
              <div className="mb-4 text-center">
                <img src={previewAvatar} alt="Xem trước Avatar" className="w-24 h-24 rounded-full mx-auto object-cover border-2 border-gray-600" />
              </div>
            )}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setEditingAvatar(false)}
                className="py-2 px-4 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveAvatar}
                disabled={!selectedAvatarFile}
                className={`py-2 px-4 rounded-lg font-bold transition-colors ${!selectedAvatarFile ? 'bg-gray-600' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Frame Selection */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-inner mb-6">
        <h3 className="text-xl font-bold text-white mb-4">Chọn khung Avatar</h3>
        {loadingFrames ? (
          <div className="flex justify-center items-center py-4 text-gray-400">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mr-3"></div>
            Đang tải khung...
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {availableFrames.map((frame) => (
              <button
                key={frame.id}
                onClick={() => setSelectedFrameId(frame.id)}
                className={`relative flex flex-col items-center p-2 rounded-lg border-2 ${selectedFrameId === frame.id ? 'border-blue-500 bg-blue-900 bg-opacity-20' : 'border-gray-700 hover:border-blue-500'} transition-all duration-200`}
                aria-label={`Chọn khung ${frame.name}`}
              >
                <img src={frame.imageUrl} alt={frame.name} className={`w-16 h-16 rounded-full object-cover mb-2 ${getFrameStyle(frame.id)}`} />
                <span className="text-sm text-gray-300">{frame.name}</span>
                {userRoleData.level < frame.minLevel && (
                  <span className="absolute top-0 right-0 bg-red-600 text-white text-xs px-2 py-1 rounded-bl-lg">Cần VIP {VIP_TIERS[Object.keys(VIP_TIERS).find(key => VIP_TIERS[key].level === frame.minLevel)?.toUpperCase() || 'GUEST']?.name || frame.minLevel}</span>
                )}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={handleSaveFrame}
          className="mt-6 w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors"
          aria-label="Lưu khung đã chọn"
          disabled={!selectedFrameId || selectedFrameId === currentUser.frameId}
        >
          Lưu khung
        </button>
      </div>

      <button onClick={onBack} className="py-3 px-6 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-bold transition-colors shadow-md">
        Quay lại
      </button>
    </div>
  );
};

export default ProfileScreen;