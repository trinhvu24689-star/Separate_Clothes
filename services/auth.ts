// services/auth.ts
// Đây là lớp dịch vụ gửi các yêu cầu HTTP đến backend để xác thực người dùng.

import { User } from '../db/schema'; // Import User từ schema
import { API_BASE_URL, saveToLocalStorage, getFromLocalStorage } from '../utils/appUtils'; // Base URL và tiện ích localStorage

// Helper to handle API responses
async function handleResponse(response: Response): Promise<any> {
  if (response.ok) {
    return response.json();
  } else {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Lỗi từ server.');
  }
}

// Helper to get JWT token from local storage
const getAuthToken = (): string | null => {
  return getFromLocalStorage('authToken', null);
};

/**
 * Đăng ký người dùng mới.
 * @param username Tên đăng nhập.
 * @param password Mật khẩu.
 * @returns Thông tin người dùng nếu thành công, null nếu tên đăng nhập đã tồn tại hoặc lỗi khác.
 */
export async function register(username: string, password: string): Promise<User | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await handleResponse(response);
    if (data.token) {
      saveToLocalStorage('authToken', data.token);
    }
    return data.user;
  } catch (err: any) {
    console.error('Registration error:', err.message);
    // Specifically handle username already exists, if backend provides distinct error
    if (err.message.includes('already exists')) {
        throw new Error('Tên đăng nhập đã tồn tại.');
    }
    throw new Error(err.message);
  }
}

/**
 * Đăng nhập người dùng.
 * @param username Tên đăng nhập.
 * @param password Mật khẩu.
 * @returns Thông tin người dùng nếu thành công, null nếu sai thông tin hoặc lỗi khác.
 */
export async function login(username: string, password: string): Promise<User | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await handleResponse(response);
    if (data.token) {
      saveToLocalStorage('authToken', data.token);
    }
    return data.user;
  } catch (err: any) {
    console.error('Login error:', err.message);
    throw new Error(err.message);
  }
}

/**
 * Đăng nhập bằng tài khoản Admin.
 * @param username Tên đăng nhập Admin.
 * @param password Mật khẩu Admin.
 * @returns Thông tin người dùng Admin nếu thành công, null nếu sai thông tin hoặc lỗi khác.
 */
export async function adminLogin(username: string, password: string): Promise<User | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await handleResponse(response);
    if (data.token) {
      saveToLocalStorage('authToken', data.token);
    }
    return data.user;
  }
  catch (err: any) {
    console.error('Admin login error:', err.message);
    throw new Error(err.message);
  }
}

/**
 * Đăng nhập bằng Google.
 * @param googleId ID người dùng từ Google OAuth.
 * @param username Tên hiển thị từ Google.
 * @param email Email từ Google.
 * @returns Thông tin người dùng (mới hoặc hiện có) nếu thành công, null nếu lỗi.
 */
export async function socialLoginGoogle(googleId: string, username: string, email: string): Promise<User | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ googleId, username, email }),
    });

    const data = await handleResponse(response);
    if (data.token) {
      saveToLocalStorage('authToken', data.token);
    }
    return data.user;
  } catch (err: any) {
    console.error('Google social login error:', err.message);
    throw new Error(err.message);
  }
}

/**
 * Đăng nhập bằng Facebook.
 * @param facebookId ID người dùng từ Facebook OAuth.
 * @param username Tên hiển thị từ Facebook.
 * @param email Email từ Facebook.
 * @returns Thông tin người dùng (mới hoặc hiện có) nếu thành công, null nếu lỗi.
 */
export async function socialLoginFacebook(facebookId: string, username: string, email: string): Promise<User | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/facebook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ facebookId, username, email }),
    });

    const data = await handleResponse(response);
    if (data.token) {
      saveToLocalStorage('authToken', data.token);
    }
    return data.user;
  } catch (err: any) {
    console.error('Facebook social login error:', err.message);
    throw new Error(err.message);
  }
}

/**
 * Yêu cầu đặt lại mật khẩu.
 * @param email Email của người dùng.
 * @returns Promise<boolean> Thành công hay thất bại.
 */
export async function requestPasswordReset(email: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    // Backend should return success even if email not found to prevent user enumeration
    await handleResponse(response); // Just check if response is OK
    return true;
  } catch (err: any) {
    console.error('Request password reset error:', err.message);
    // Frontend still returns true if a generic message is expected
    return true; // Or false if you want to show specific error
  }
}

export { getAuthToken };