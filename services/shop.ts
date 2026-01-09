// services/shop.ts
// Đây là lớp dịch vụ gửi các yêu cầu HTTP đến backend để xử lý các giao dịch cửa hàng (mua sao, nâng cấp VIP, mua khung).

import { User, StarPack, VipTier, Frame } from '../db/schema';
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
 * Mua gói sao.
 * @param userId ID của người dùng.
 * @param packId ID của gói sao.
 * @returns Người dùng đã cập nhật nếu thành công, null nếu không tìm thấy gói hoặc lỗi.
 */
export async function buyStars(userId: string, packId: string): Promise<User | null> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication token missing.');

  try {
    const response = await fetch(`${API_BASE_URL}/shop/buy-stars`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ userId, packId }), // Pass userId and packId
    });

    return await handleResponse(response);
  } catch (err: any) {
    console.error('Error buying stars:', err.message);
    throw new Error(err.message);
  }
}

/**
 * Nâng cấp gói VIP cho người dùng.
 * @param userId ID của người dùng.
 * @param vipTierId ID của gói VIP.
 * @returns Người dùng đã cập nhật nếu thành công, null nếu không tìm thấy gói hoặc lỗi.
 */
export async function upgradeVip(userId: string, vipTierId: string): Promise<User | null> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication token missing.');

  try {
    const response = await fetch(`${API_BASE_URL}/shop/upgrade-vip`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ userId, vipTierId }), // Pass userId and vipTierId
    });

    return await handleResponse(response);
  } catch (err: any) {
    console.error('Error upgrading VIP:', err.message);
    throw new Error(err.message);
  }
}

/**
 * Mua khung avatar cho người dùng.
 * @param userId ID của người dùng.
 * @param frameId ID của khung avatar.
 * @returns Người dùng đã cập nhật nếu thành công, null nếu không đủ sao hoặc lỗi.
 */
export async function buyFrame(userId: string, frameId: string): Promise<User | null> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication token missing.');

  try {
    const response = await fetch(`${API_BASE_URL}/shop/buy-frame`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ userId, frameId }), // Pass userId and frameId
    });

    return await handleResponse(response);
  } catch (err: any) {
    console.error('Error buying frame:', err.message);
    // Specific error for insufficient stars can be handled here if backend sends distinct code
    if (err.message.includes('Insufficient stars') || err.message.includes('not enough stars')) {
      return null;
    }
    throw new Error(err.message);
  }
}

/**
 * Lấy danh sách các gói sao.
 * @returns Mảng các đối tượng StarPack.
 */
export async function fetchStarPacks(): Promise<StarPack[]> {
  const token = getAuthToken(); // Optional token

  try {
    const response = await fetch(`${API_BASE_URL}/shop/star-packs`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });

    return await handleResponse(response);
  } catch (err: any) {
    console.error('Error fetching star packs:', err.message);
    return [];
  }
}