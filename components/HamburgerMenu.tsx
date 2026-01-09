import React from 'react';
import { User, VIP_TIERS } from '../utils/appUtils';

interface HamburgerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (screen: string) => void;
  currentUser: User;
    onLogout: () => void;
  isAdminMode: boolean;
}

const HamburgerMenu: React.FC<HamburgerMenuProps> = ({
  isOpen,
  onClose,
  onNavigate,
  currentUser,
  onLogout,
  isAdminMode,
}) => {
  const userRoleData = VIP_TIERS[currentUser.role.toUpperCase()] || VIP_TIERS.GUEST;

  const handleNavigate = (screen: string) => {
    onNavigate(screen);
    onClose();
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-[60] transition-opacity duration-300"
          onClick={onClose}
          aria-label="Đóng menu"
        ></div>
      )}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-gray-800 shadow-xl z-[70] transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Menu</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Đóng menu">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        <div className="p-4 border-b border-gray-700 text-center">
          <img
            src={currentUser.avatarUrl}
            alt="Avatar"
            className="w-20 h-20 rounded-full mx-auto mb-2 object-cover border-2 border-blue-500"
            aria-label="Ảnh đại diện của bạn"
          />
          <p className="text-lg font-semibold text-white">{currentUser.username}</p>
          <p className="text-sm text-gray-400">Cấp: <span className="neon-text font-bold">{userRoleData.name}</span></p>
          <p className="text-sm text-gray-400">Sao: <span className="text-yellow-400 font-bold">{currentUser.stars}</span></p>
        </div>
        <nav className="flex flex-col p-2 space-y-1">
          <button onClick={() => handleNavigate('editor')} className="menu-item">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V6m3 3h6m-6 3h6m6-3v10a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2h2m4 0h5M6 12h8"></path></svg>
            Tạo hình ảnh
          </button>
          <button onClick={() => handleNavigate('shop')} className="menu-item">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
            Cửa hàng Sao
          </button>
          <button onClick={() => handleNavigate('history')} className="menu-item">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            Lịch sử
          </button>
          <button onClick={() => handleNavigate('vip')} className="menu-item">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.975 2.888a1 1 0 00-.363 1.118l1.519 4.674c.3.921-.755 1.688-1.539 1.118l-3.975-2.888a1 1 0 00-1.176 0l-3.975 2.888c-.784.57-1.838-.197-1.539-1.118l1.519-4.674a1 1 0 00-.363-1.118l-3.975-2.888c-.783-.57-.381-1.81.588-1.81h4.915a1 1 0 00.95-.69l1.519-4.674z"></path></svg>
            Cấp VIP
          </button>
          <button onClick={() => handleNavigate('profile')} className="menu-item">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
            Hồ sơ
          </button>
          {userRoleData.level >= VIP_TIERS.TALENT.level && (
            <button onClick={() => handleNavigate('free-draw')} className="menu-item">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4v16M17 4v16M3 8h4m6 0h4M3 12h4m6 0h4m-6 4h4m-6-4h4m-6 4h4M3 16h4m6 0h4"></path></svg>
            Vẽ Tự Do
          </button>
          )}
          {userRoleData.level >= VIP_TIERS.ULTRA_INFINITY.level && (
            <button onClick={() => handleNavigate('chat')} className="menu-item">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
              Chat
            </button>
          )}
          {isAdminMode && (
            <button onClick={() => handleNavigate('admin-panel')} className="menu-item text-red-400">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              Bảng quản trị
            </button>
          )}
          <button onClick={onLogout} className="menu-item text-red-500 hover:text-red-400 mt-4">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            Đăng xuất
          </button>
        </nav>
      </div>
      <style>
        {`
        .menu-item {
          display: flex;
          align-items: center;
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          color: #d1d5db; /* gray-300 */
          transition: background-color 0.15s ease-in-out, color 0.15s ease-in-out;
        }
        .menu-item:hover {
          background-color: #4b5563; /* gray-700 */
          color: #ffffff;
        }
      `}
      </style>
    </>
  );
};

export default HamburgerMenu;