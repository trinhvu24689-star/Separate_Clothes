import React, { useState, useEffect } from 'react';
import { VIP_TIERS } from '../utils/appUtils'; // Using VIP_TIERS from appUtils for convenience
import * as adminService from '../services/admin';
import * as userService from '../services/user';
import { User, VipTier } from '../db/schema'; // Use User and VipTier schema

interface AdminPanelProps {
  currentUser: User;
  onBack: () => void;
  onUpdateCurrentUser: (user: User) => void; // Callback to update currentUser in App.tsx
}

const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser, onBack, onUpdateCurrentUser }) => {
  const [key, setKey] = useState('');
  const [accessGranted, setAccessGranted] = useState(currentUser.role === 'ADMIN');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [buffStarsAmount, setBuffStarsAmount] = useState(0);
  const [newRole, setNewRole] = useState<User['role']>('GUEST');
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [vipTiers, setVipTiers] = useState<VipTier[]>([]);

  useEffect(() => {
    // Fetch all users and VIP tiers when admin panel is accessed
    const loadData = async () => {
      if (accessGranted) {
        try {
          const users = await adminService.fetchAllUsers();
          setAllUsers(users);
          const tiers = await userService.fetchVipTiers();
          setVipTiers(tiers);
        } catch (err) {
          console.error('Error loading admin data:', err);
          setError('Lỗi khi tải dữ liệu quản trị.');
        }
      }
    };
    loadData();
  }, [accessGranted]);


  const handleKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (adminService.checkAdminPanelKey(key)) {
      setAccessGranted(true);
      setMessage('Truy cập Bảng quản trị thành công!');
      // Reload data after access granted
      const users = await adminService.fetchAllUsers();
      setAllUsers(users);
      const tiers = await userService.fetchVipTiers();
      setVipTiers(tiers);
      setTimeout(() => setMessage(null), 3000);
    } else {
      setError('Mã khóa không đúng. Thử lại.');
    }
  };

  const handleBuffStars = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);
    if (!targetUserId || !currentUser.id) {
      setActionMessage('Vui lòng chọn người dùng mục tiêu.');
      return;
    }
    try {
      const updatedUser = await adminService.buffStars(currentUser.id, targetUserId, buffStarsAmount);
      if (updatedUser) {
        setActionMessage(`Đã cộng ${buffStarsAmount} sao cho ${updatedUser.username}. Tổng: ${updatedUser.stars}`);
        setAllUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
        if (currentUser.id === updatedUser.id) onUpdateCurrentUser(updatedUser);
      } else {
        setActionMessage('Không tìm thấy người dùng hoặc lỗi khi buff sao.');
      }
    } catch (err) {
      console.error('Error buffing stars:', err);
      setActionMessage('Lỗi khi buff sao.');
    }
  };

  const handleLockAccount = async (isLocked: boolean) => {
    setActionMessage(null);
    if (!targetUserId || !currentUser.id) {
      setActionMessage('Vui lòng chọn người dùng mục tiêu.');
      return;
    }
    try {
      const updatedUser = await adminService.lockAccount(currentUser.id, targetUserId, isLocked);
      if (updatedUser) {
        setActionMessage(`Đã ${isLocked ? 'khóa' : 'mở khóa'} tài khoản ${updatedUser.username}.`);
        setAllUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
        if (currentUser.id === updatedUser.id) onUpdateCurrentUser(updatedUser);
      } else {
        setActionMessage('Không tìm thấy người dùng hoặc lỗi khi khóa tài khoản.');
      }
    } catch (err) {
      console.error('Error locking account:', err);
      setActionMessage('Lỗi khi khóa tài khoản.');
    }
  };

  const handleSetRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);
    if (!targetUserId || !currentUser.id) {
      setActionMessage('Vui lòng chọn người dùng mục tiêu.');
      return;
    }
    try {
      const updatedUser = await adminService.setRole(currentUser.id, targetUserId, newRole);
      if (updatedUser) {
        setActionMessage(`Đã thăng cấp ${updatedUser.username} lên ${VIP_TIERS[newRole.toUpperCase()]?.name || newRole}.`);
        setAllUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
        if (currentUser.id === updatedUser.id) onUpdateCurrentUser(updatedUser);
      } else {
        setActionMessage('Không tìm thấy người dùng hoặc lỗi khi thăng cấp.');
      }
    } catch (err) {
      console.error('Error setting role:', err);
      setActionMessage('Lỗi khi thăng cấp.');
    }
  };

  const handleCreateAIFrame = async () => {
    setActionMessage('AI đang tạo khung avatar... (Chức năng giả lập)');
    if (!currentUser.id) return;
    try {
      const newFrame = await adminService.createAIFrame(currentUser.id, "Mô tả khung avatar AI"); // Placeholder prompt
      if (newFrame) {
        setActionMessage(`Đã tạo khung avatar AI mới: ${newFrame.name}!`);
        // In a real app, you'd also update the global list of available frames
      } else {
        setActionMessage('Lỗi khi tạo khung AI.');
      }
    } catch (err) {
      console.error('Error creating AI frame:', err);
      setActionMessage('Lỗi khi tạo khung AI.');
    }
  };

  if (!accessGranted) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-gray-900 rounded-xl shadow-2xl max-w-md w-full border-neon-rainbow z-10">
        <h2 className="text-3xl font-bold mb-6 neon-text">Bảng quản trị</h2>
        {error && <p className="text-red-400 mb-4 text-sm animate-bounce">{error}</p>}
        <form onSubmit={handleKeySubmit} className="w-full space-y-4">
          <div>
            <label htmlFor="admin-key" className="block text-gray-300 text-sm font-bold mb-1">Nhập mã khóa quản trị:</label>
            <input
              type="password"
              id="admin-key"
              className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500 text-white"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              required
              aria-label="Mã khóa quản trị"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-lg font-bold text-lg shadow-lg bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75"
            aria-label="Mở khóa Bảng quản trị"
          >
            Mở khóa
          </button>
        </form>
        <button onClick={onBack} className="mt-4 text-blue-400 hover:text-blue-300 transition-colors duration-200 text-sm">
          Quay lại
        </button>
      </div>
    );
  }

  const selectedUser = allUsers.find(u => u.id === targetUserId);
  const currentUserRoleLevel = VIP_TIERS[currentUser.role.toUpperCase()]?.level || 0;


  return (
    <div className="flex flex-col p-6 bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl border-neon-rainbow overflow-y-auto no-scrollbar">
      <h2 className="text-3xl font-bold mb-6 neon-text text-center">Bảng quản trị</h2>
      {message && <p className="text-green-400 mb-4 text-center text-sm">{message}</p>}
      {error && <p className="text-red-400 mb-4 text-center text-sm animate-bounce">{error}</p>}
      {actionMessage && <p className="text-yellow-400 mb-4 text-center text-sm">{actionMessage}</p>}

      <div className="space-y-6">
        {/* User Selection */}
        <div>
          <label htmlFor="target-user-select" className="block text-gray-300 text-sm font-bold mb-1">Chọn người dùng mục tiêu:</label>
          <select
            id="target-user-select"
            className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
            value={targetUserId || ''}
            onChange={(e) => setTargetUserId(e.target.value)}
            aria-label="Chọn người dùng mục tiêu"
          >
            <option value="">-- Chọn người dùng --</option>
            {allUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.username} ({user.role}, {user.stars} sao)
              </option>
            ))}
          </select>
        </div>

        {selectedUser && (
          <div className="bg-gray-800 p-4 rounded-lg">
            <p className="text-white text-lg font-semibold">Người dùng đã chọn: <span className="neon-text">{selectedUser.username}</span></p>
            <p className="text-gray-400 text-sm">Role: {selectedUser.role}, Sao: {selectedUser.stars}</p>
          </div>
        )}

        {/* Buff Stars */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-xl font-semibold text-white mb-3">Công cụ Buff sao</h3>
          <form onSubmit={handleBuffStars} className="flex flex-col space-y-3">
            <input
              type="number"
              value={buffStarsAmount}
              onChange={(e) => setBuffStarsAmount(parseInt(e.target.value))}
              min="1"
              max="999999"
              className="p-2 rounded-lg bg-gray-700 border border-gray-600 text-white"
              aria-label="Số sao để buff"
            />
            <button
              type="submit"
              className="py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold transition-colors"
              disabled={!targetUserId || buffStarsAmount <= 0}
            >
              Buff Sao
            </button>
          </form>
        </div>

        {/* Lock Account */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-xl font-semibold text-white mb-3">Công cụ khóa/hạn chế tài khoản</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => handleLockAccount(true)}
              className="flex-1 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-700 text-white font-bold transition-colors"
              disabled={!targetUserId || selectedUser?.role === 'LOCKED'}
            >
              Khóa Tài Khoản
            </button>
            <button
              onClick={() => handleLockAccount(false)}
              className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors"
              disabled={!targetUserId || selectedUser?.role !== 'LOCKED'}
            >
              Mở Khóa Tài Khoản
            </button>
          </div>
          <p className="text-gray-400 text-sm mt-2">Lưu ý: Khóa tài khoản chỉ thay đổi role. Để chặn hoàn toàn, cần logic backend.</p>
        </div>

        {/* Auto Promote Role */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-xl font-semibold text-white mb-3">Công cụ tự động thăng cấp gói</h3>
          <form onSubmit={handleSetRole} className="flex flex-col space-y-3">
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as User['role'])}
              className="p-2 rounded-lg bg-gray-700 border border-gray-600 text-white"
              aria-label="Chọn cấp VIP mới"
              disabled={!targetUserId}
            >
              <option value="">Chọn cấp VIP</option>
              {vipTiers
                .filter(tier => tier.level <= currentUserRoleLevel || currentUser.role === 'ADMIN') // Admin can promote to any, others limited
                .map((tier) => (
                  <option key={tier.id} value={tier.name.toUpperCase().replace(/[^A-Z_]/g, '')}>
                    {tier.name} (Cấp {tier.level})
                  </option>
                ))}
            </select>
            <button
              type="submit"
              className="py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold transition-colors"
              disabled={!targetUserId || !newRole}
            >
              Thăng Cấp Gói
            </button>
          </form>
        </div>

        {/* AI Frame Creation (Admin Only) */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-xl font-semibold text-white mb-3">Tạo Khung Avatar bằng AI</h3>
          <button
            onClick={handleCreateAIFrame}
            className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors"
            disabled={currentUser.role !== 'ADMIN'}
          >
            Khởi tạo AI Tạo Khung
          </button>
          <p className="text-gray-400 text-sm mt-2">AI chỉ vẽ Khung AVT (Chức năng giả lập, yêu cầu backend AI)</p>
        </div>

        {/* Anti Cheat (Placeholder) */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-xl font-semibold text-white mb-3">Hệ thống Anti Cheat (Mô phỏng)</h3>
          <p className="text-gray-400 text-sm">
            Tối đa hóa chống hacker, chỉ hiện chỉnh sửa dữ liệu. Nếu phát hiện tình huống quá 3 lần cấm mạng IP và cảnh báo nhẹ nhàng; quá 5 lần cấm IP thiết bị và cảnh báo nguy hiểm. (Chức năng giả lập, yêu cầu backend).
          </p>
          <button className="w-full py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold mt-3 transition-colors opacity-50 cursor-not-allowed">
            Xem Nhật Ký Anti Cheat
          </button>
        </div>
      </div>

      <button onClick={onBack} className="mt-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors">
        Quay lại
      </button>
    </div>
  );
};

export default AdminPanel;