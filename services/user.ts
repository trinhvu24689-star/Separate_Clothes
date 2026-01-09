// services/user.ts
// Đây là lớp dịch vụ gửi các yêu cầu HTTP đến backend để quản lý người dùng và tương tác với dữ liệu của họ.

import { User, HistoryEntry, Frame, VipTier, VipTiersMap } from '../db/schema';
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
 * Lấy thông tin người dùng hiện tại.
 * @param userId ID của người dùng.
 * @returns Thông tin người dùng hoặc null nếu không tìm thấy.
 */
export async function fetchCurrentUser(userId: string): Promise<User | null> {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/user/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    return await handleResponse(response);
  } catch (err: any) {
    console.error('Error fetching current user:', err.message);
    return null;
  }
}

/**
 * Cập nhật thông tin hồ sơ người dùng.
 * @param userId ID của người dùng cần cập nhật.
 * @param updates Các trường cần cập nhật.
 * @returns Người dùng đã cập nhật hoặc null nếu không tìm thấy.
 */
export async function updateProfile(userId: string, updates: Partial<User>): Promise<User | null> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication token missing.');

  try {
    const response = await fetch(`${API_BASE_URL}/user/${userId}/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });

    return await handleResponse(response);
  } catch (err: any) {
    console.error('Error updating user profile:', err.message);
    throw new Error(err.message);
  }
}

/**
 * Trừ sao của người dùng.
 * @param userId ID của người dùng.
 * @param cost Số sao cần trừ.
 * @returns Người dùng đã cập nhật nếu đủ sao, null nếu không đủ.
 */
export async function deductStars(userId: string, cost: number): Promise<User | null> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication token missing.');

  try {
    const response = await fetch(`${API_BASE_URL}/user/${userId}/deduct-stars`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ amount: cost, reason: 'Image download' }),
    });

    return await handleResponse(response);
  } catch (err: any) {
    console.error('Error deducting stars:', err.message);
    // Backend should return 400 with 'Insufficient stars' message for frontend to catch
    if (err.message.includes('Insufficient stars')) {
      return null; // Signal not enough stars
    }
    throw new Error(err.message);
  }
}

/**
 * Cộng sao miễn phí hàng ngày cho người dùng.
 * @param userId ID của người dùng.
 * @returns Người dùng đã cập nhật hoặc null nếu đã claim hoặc lỗi.
 */
export async function addDailyStars(userId: string): Promise<User | null> {
  const token = getAuthToken();
  if (!token) return null; // No token, no daily stars for you

  try {
    const response = await fetch(`${API_BASE_URL}/user/${userId}/claim-daily-stars`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    return await handleResponse(response);
  } catch (err: any) {
    // Expected error if already claimed today, just return current user data
    if (err.message.includes('Daily stars already claimed today')) {
      const currentUser = await fetchCurrentUser(userId);
      return currentUser;
    }
    console.error('Error adding daily stars:', err.message);
    return null;
  }
}

/**
 * Thêm một mục vào lịch sử xử lý ảnh của người dùng.
 * @param userId ID của người dùng.
 * @param historyEntry Dữ liệu lịch sử mới (không bao gồm userId và id).
 * @returns Người dùng đã cập nhật.
 */
export async function addImageToHistory(userId: string, historyEntry: Omit<HistoryEntry, 'userId' | 'id' | 'createdAt' | 'updatedAt'>): Promise<User | null> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication token missing.');

  try {
    const response = await fetch(`${API_BASE_URL}/user/${userId}/history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(historyEntry),
    });

    return await handleResponse(response);
  } catch (err: any) {
    console.error('Error adding image to history:', err.message);
    throw new Error(err.message);
  }
}

/**
 * Lấy danh sách khung avatar.
 * @returns Mảng các đối tượng Frame.
 */
export async function fetchFrames(): Promise<Frame[]> {
  // Frames might be public, or require token if some are exclusive
  // For now, let's assume public access, but can add token later
  const token = getAuthToken(); // Optional token

  try {
    const response = await fetch(`${API_BASE_URL}/user/frames`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }), // Include token if available
      },
    });

    return await handleResponse(response);
  } catch (err: any) {
    console.error('Error fetching frames:', err.message);
    return [];
  }
}

/**
 * Lấy danh sách các cấp VIP.
 * @returns Mảng các đối tượng VipTier.
 */
export async function fetchVipTiers(): Promise<VipTier[]> {
  const token = getAuthToken(); // Optional token

  try {
    const response = await fetch(`${API_BASE_URL}/user/vip-tiers`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });

    return await handleResponse(response);
  } catch (err: any) {
    console.error('Error fetching VIP tiers:', err.message);
    return [];
  }
}