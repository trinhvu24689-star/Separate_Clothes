import React, { useState } from 'react';
import { saveToLocalStorage, isAdminCredentials } from '../utils/appUtils';
import * as authService from '../services/auth';
import { User } from '../db/schema'; // Import User interface from schema

interface AuthScreenProps {
  onLoginSuccess: (user: User) => void;
  onAdminLogin: (user: User) => void;
  onShowForgotPassword: () => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess, onAdminLogin, onShowForgotPassword }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSocialLogin = async (platform: 'google' | 'facebook') => {
    setLoading(true);
    setError(null);
    try {
      // In a real app, this would initiate OAuth flow, then backend returns user data
      // For now, simulate with mock data
      const mockSocialId = `mock_${platform}_${Date.now()}`;
      const mockUsername = `${platform}User_${Math.floor(Math.random() * 1000)}`;
      const mockEmail = `${mockUsername}@example.com`; // Assume email is available

      let user: User | null;
      if (platform === 'google') {
        user = await authService.socialLoginGoogle(mockSocialId, mockUsername, mockEmail);
      } else {
        user = await authService.socialLoginFacebook(mockSocialId, mockUsername, mockEmail);
      }

      if (user) {
        saveToLocalStorage('currentUser', user); // Save to client-side state
        onLoginSuccess(user);
      } else {
        setError(`Lỗi khi đăng nhập bằng ${platform}.`);
      }
    } catch (err) {
      console.error(`Error with ${platform} login:`, err);
      setError(`Lỗi khi đăng nhập bằng ${platform}. Vui lòng thử lại.`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Check for admin login first (using client-side hardcoded credentials for demo)
      if (isLogin && isAdminCredentials(username, password)) {
        const adminUser = await authService.adminLogin(username, password);
        if (adminUser) {
          saveToLocalStorage('currentUser', adminUser);
          onAdminLogin(adminUser);
          return;
        }
      }

      let user: User | null;
      if (isLogin) {
        user = await authService.login(username, password);
      } else {
        user = await authService.register(username, password);
      }

      if (user) {
        saveToLocalStorage('currentUser', user);
        if (rememberMe) {
          saveToLocalStorage('rememberedUser', { username, password });
        } else {
          localStorage.removeItem('rememberedUser');
        }
        onLoginSuccess(user);
      } else {
        setError(isLogin ? 'Tên đăng nhập hoặc mật khẩu không đúng.' : 'Tên đăng nhập đã tồn tại hoặc có lỗi khi đăng ký.');
      }
    } catch (err) {
      console.error('Authentication error:', err);
      setError('Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-gray-900 rounded-xl shadow-2xl max-w-md w-full border-neon-rainbow z-10">
      <h2 className="text-3xl font-bold mb-6 neon-text">{isLogin ? 'Đăng Nhập' : 'Đăng Ký'}</h2>
      {error && <p className="text-red-400 mb-4 text-sm animate-bounce">{error}</p>}
      <form onSubmit={handleSubmit} className="w-full space-y-4">
        <div>
          <label htmlFor="username" className="block text-gray-300 text-sm font-bold mb-1">Tên đăng nhập:</label>
          <input
            type="text"
            id="username"
            className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            aria-label="Tên đăng nhập"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-gray-300 text-sm font-bold mb-1">Mật khẩu:</label>
          <input
            type="password"
            id="password"
            className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            aria-label="Mật khẩu"
          />
        </div>
        {isLogin && (
          <div className="flex items-center justify-between text-sm">
            <label htmlFor="rememberMe" className="flex items-center text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                id="rememberMe"
                className="form-checkbox h-4 w-4 text-blue-500 rounded border-gray-600 focus:ring-blue-500 mr-2"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Lưu thông tin đăng nhập
            </label>
            <button
              type="button"
              onClick={onShowForgotPassword}
              className="text-blue-400 hover:text-blue-300 transition-colors duration-200"
            >
              Quên mật khẩu?
            </button>
          </div>
        )}
        <button
          type="submit"
          className={`w-full py-3 rounded-lg font-bold text-lg shadow-lg transition-all duration-200 ease-in-out
                      ${loading ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75'}
                    `}
          disabled={loading}
          aria-label={isLogin ? 'Đăng Nhập' : 'Đăng Ký'}
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
              Đang xử lý...
            </div>
          ) : (
            isLogin ? 'Đăng Nhập' : 'Đăng Ký'
          )}
        </button>
      </form>
      <div className="mt-4 w-full flex flex-col space-y-2">
        <button
          onClick={() => handleSocialLogin('google')}
          className="w-full py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold flex items-center justify-center shadow-md transition-colors"
          disabled={loading}
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12.24 10.285V11.85h4.128c-.201 1.054-.844 2.108-1.97 2.923l.004.002 1.258 1.066c.864-.814 1.547-2.016 1.83-3.324h-.005l.011-.073.01-.137zm-1.892 4.095c-1.393-.118-2.618-.891-3.467-1.954l-1.332 1.034c.828 1.341 2.052 2.378 3.518 2.766h.001l.002-.001.002-.001zm-5.46-3.834c.068-.598.175-1.189.317-1.768l-1.346-1.045c-.27 1.077-.428 2.19-.428 3.32v.001l.001-.001.001-.001zm2.366-4.592l.02.011 1.3-.872c-.752-.693-1.636-1.12-2.585-1.12-1.463 0-2.736.963-3.486 2.324l1.328 1.034c.773-1.01 1.79-1.636 2.87-1.636z" fill="#FFFFFF"/><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z" fill="#4285F4"/></svg>
          Đăng nhập bằng Google
        </button>
        <button
          onClick={() => handleSocialLogin('facebook')}
          className="w-full py-3 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold flex items-center justify-center shadow-md transition-colors"
          disabled={loading}
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm3.82 7.5H12.5V8.2c0-.52.28-1.02.99-1.02h1.56V5.41c-.28-.03-1.24-.12-2.36-.12-2.38 0-3.95 1.4-3.95 4.07v2.14H8v2.6h1.99V20h3.51v-7.39h2.32l.37-2.61z" fill="#FFFFFF"/></svg>
          Đăng nhập bằng Facebook
        </button>
      </div>
      <button
        onClick={() => setIsLogin(!isLogin)}
        className="mt-6 text-blue-400 hover:text-blue-300 transition-colors duration-200 text-sm"
        aria-label={isLogin ? 'Chuyển sang Đăng Ký' : 'Chuyển sang Đăng Nhập'}
      >
        {isLogin ? 'Chưa có tài khoản? Đăng ký ngay!' : 'Đã có tài khoản? Đăng nhập!'}
      </button>
    </div>
  );
};

export default AuthScreen;