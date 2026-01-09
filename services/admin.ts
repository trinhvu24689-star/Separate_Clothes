// services/admin.ts
// Đây là lớp dịch vụ gửi các yêu cầu HTTP đến backend cho các chức năng quản trị.
// Các API này yêu cầu quyền truy cập đặc biệt (JWT với role 'ADMIN' hoặc 'MODERATOR').

import { User, Frame, VipTiersMap } from '../db/schema';
import { API_BASE_URL, getFromLocalStorage } from '../utils/appUtils';

// Helper to get JWT token from local storage
const getAuthToken = (): string | null => {
  return getFromLocalStorage('authToken', null);
};

// Helper to handle API responses
async function handleResponse(response: Response): Promise<any> {
  if (response.ok) {
    return response.json();
  } else {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Lỗi từ server.');
  }
}

/**
 * Kiểm tra mã khóa truy cập bảng quản trị (chỉ frontend).
 * Trong backend, việc này sẽ được xử lý bằng kiểm tra token/quyền.
 * @param key Mã khóa.
 * @returns true nếu hợp lệ, false nếu không.
 */
export function checkAdminPanelKey(key: string): boolean {
  return key === 'QTV2468'; // Mã khóa hardcode cho mô phỏng
}

/**
 * Lấy danh sách tất cả người dùng.
 * @returns Mảng người dùng (không bao gồm passwordHash).
 */
export async function fetchAllUsers(): Promise<User[]> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication token missing.');

  try {
    const response = await fetch(`${API_BASE_URL}/admin/users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    return await handleResponse(response);
  } catch (err: any) {
    console.error('Error fetching all users:', err.message);
    throw new Error(err.message);
  }
}

/**
 * Buff (cộng thêm) sao cho một người dùng cụ thể.
 * @param adminId ID của Admin thực hiện.
 * @param targetUserId ID của người dùng mục tiêu.
 * @param amount Số sao cần cộng.
 * @returns Người dùng đã cập nhật hoặc null nếu không tìm thấy.
 */
export async function buffStars(adminId: string, targetUserId: string, amount: number): Promise<User | null> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication token missing.');

  try {
    const response = await fetch(`${API_BASE_URL}/admin/users/${targetUserId}/buff-stars`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ amount, adminId }), // Send adminId for logging on backend
    });

    return await handleResponse(response);
  } catch (err: any) {
    console.error('Error buffing stars:', err.message);
    throw new Error(err.message);
  }
}

/**
 * Khóa hoặc hạn chế tài khoản người dùng.
 * @param adminId ID của Admin thực hiện.
 * @param targetUserId ID của người dùng mục tiêu.
 * @param isLocked Trạng thái khóa (true để khóa, false để mở khóa).
 * @returns Người dùng đã cập nhật hoặc null nếu không tìm thấy.
 */
export async function lockAccount(adminId: string, targetUserId: string, isLocked: boolean): Promise<User | null> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication token missing.');

  try {
    const response = await fetch(`${API_BASE_URL}/admin/users/${targetUserId}/lock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ isLocked, adminId }),
    });

    return await handleResponse(response);
  } catch (err: any) {
    console.error('Error locking account:', err.message);
    throw new Error(err.message);
  }
}

/**
 * Thăng cấp gói VIP cho một người dùng.
 * @param adminId ID của Admin thực hiện.
 * @param targetUserId ID của người dùng mục tiêu.
 * @param newRoleName Tên role mới (ví dụ: 'VIP', 'SSVIP').
 * @returns Người dùng đã cập nhật hoặc null nếu không tìm thấy.
 */
export async function setRole(adminId: string, targetUserId: string, newRoleName: User['role']): Promise<User | null> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication token missing.');

  try {
    const response = await fetch(`${API_BASE_URL}/admin/users/${targetUserId}/set-role`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ role: newRoleName, adminId }),
    });

    return await handleResponse(response);
  } catch (err: any) {
    console.error('Error setting user role:', err.message);
    throw new Error(err.message);
  }
}

/**
 * Tạo một khung avatar bằng AI (mô phỏng).
 * @param adminId ID của Admin thực hiện.
 * @param prompt Mô tả cho AI để tạo khung.
 * @returns Thông tin khung mới được tạo hoặc null nếu lỗi.
 */
export async function createAIFrame(adminId: string, prompt: string): Promise<Frame | null> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication token missing.');

  try {
    const response = await fetch(`${API_BASE_URL}/admin/ai-create-frame`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ prompt, adminId }),
    });

    return await handleResponse(response);
  } catch (err: any) {
    console.error('Error creating AI frame:', err.message);
    throw new Error(err.message);
  }
}