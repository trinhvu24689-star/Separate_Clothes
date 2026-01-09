// utils/appUtils.ts
// Các hàm tiện ích frontend, không tương tác trực tiếp với DB (sẽ dùng lớp Services).

import { User, VipTiersMap } from "../db/schema";
export type { User } from "../db/schema"; // Re-export User type from db/schema

export const API_BASE_URL = 'http://localhost:5000/api'; // Base URL cho các API backend

export const VIP_TIERS = VipTiersMap; // Sử dụng VipTiersMap trực tiếp

export const DEFAULT_USER: User = {
  id: 'guest_user_id', // ID tạm thời cho người dùng chưa đăng nhập
  username: 'Khách',
  role: 'GUEST',
  stars: 0,
  dailyStarClaimed: '',
  avatarUrl: 'https://via.placeholder.com/150/0000FF/FFFFFF?text=Guest', // Default avatar
  frameId: 'default', // ID của khung mặc định (sẽ được seed vào DB)
  history: [],
  createdAt: Date.now(), // Dùng Unix timestamp (number) cho consistency
  updatedAt: Date.now(), // Dùng Unix timestamp (number) cho consistency
};

const ADMIN_CREDENTIALS = {
  username: 'Quang Tiger Master G',
  password: 'Volkath666',
};

const ADMIN_PANEL_KEY = 'QTV2468';

// --- Local Storage Utilities (for frontend state persistence) ---
export const saveToLocalStorage = (key: string, value: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Lỗi khi lưu vào localStorage:', error);
  }
};

export const getFromLocalStorage = (key: string, defaultValue: any) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Lỗi khi đọc từ localStorage:', error);
    return defaultValue;
  }
};

// This function will be used by UI components to update the *client-side representation* of the user
// After a real API call to update user info on backend.
export const updateCurrentUserClientSide = (updates: Partial<User>) => {
  const currentUser = getFromLocalStorage('currentUser', null);
  if (currentUser) {
    const updatedUser = { ...currentUser, ...updates };
    saveToLocalStorage('currentUser', updatedUser);
  }
};

// --- Admin Panel Utilities (Frontend-side check) ---
export const checkAdminPanelKey = (key: string): boolean => {
  return key === ADMIN_PANEL_KEY;
};

export const isAdminCredentials = (username: string, password: string): boolean => {
  return username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password;
};


// --- Cost Calculation (Frontend-side helper) ---
export const getCostForResolution = (resolution: string): number => {
  switch (resolution) {
    case 'thap': return 10;
    case 'trungBinh': return 20;
    case 'cao': return 50;
    case '1K': return 100;
    case '2K': return 200;
    case '4K': return 400;
    default: return 0;
  }
};

// --- Drawing Utilities ---
export const DEFAULT_PALETTE = [
  '#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3', // Rainbow
  '#FFFFFF', '#C0C0C0', '#808080', '#000000', // Grayscale
  '#8B4513', '#A0522D', '#D2691E', '#CD853F', // Browns
  '#F08080', '#FA8072', '#E9967A', '#FFA07A', // Reds/Oranges
  '#20B2AA', '#40E0D0', '#48D1CC', '#00CED1', // Blues/Greens
];