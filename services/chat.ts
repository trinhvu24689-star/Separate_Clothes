// services/chat.ts
// Đây là lớp dịch vụ gửi các yêu cầu HTTP đến backend cho chức năng chat.
// Đối với chat real-time, WebSockets sẽ được tích hợp ở đây sau này.

import { ChatMessage, User } from '../db/schema';
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
 * Gửi một tin nhắn chat mới.
 * @param senderId ID người gửi.
 * @param senderUsername Tên người gửi.
 * @param senderRole Role của người gửi.
 * @param content Nội dung tin nhắn.
 * @param roomId ID phòng chat (tùy chọn).
 * @returns Tin nhắn đã gửi nếu thành công, null nếu lỗi.
 */
export async function sendMessage(
  senderId: string,
  senderUsername: string,
  senderRole: User['role'],
  content: string,
  roomId?: string,
): Promise<ChatMessage | null> {
  const token = getAuthToken();
  if (!token) throw new Error('Authentication token missing.');

  try {
    const response = await fetch(`${API_BASE_URL}/chat/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ senderId, senderUsername, senderRole, content, roomId }),
    });

    return await handleResponse(response);
  } catch (err: any) {
    console.error('[ChatService] Error sending message:', err.message);
    throw new Error(err.message);
  }
}

/**
 * Lấy lịch sử tin nhắn cho một phòng chat.
 * @param roomId ID phòng chat (tùy chọn, mặc định là chat cộng đồng).
 * @param limit Số lượng tin nhắn tối đa.
 * @param offset Bắt đầu từ tin nhắn thứ bao nhiêu.
 * @returns Mảng các tin nhắn.
 */
export async function fetchMessages(roomId?: string, limit = 50, offset = 0): Promise<ChatMessage[]> {
  const token = getAuthToken();
  // Chat messages might be publicly accessible, but if it's a private chat, token is required.
  // For now, assume public chat does not strictly require token for fetching, but good to send if available.
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const queryParams = new URLSearchParams();
    if (roomId) queryParams.append('roomId', roomId);
    queryParams.append('limit', limit.toString());
    queryParams.append('offset', offset.toString());

    const response = await fetch(`${API_BASE_URL}/chat/messages?${queryParams.toString()}`, {
      method: 'GET',
      headers: headers,
    });

    return await handleResponse(response);
  } catch (err: any) {
    console.error('[ChatService] Error fetching messages:', err.message);
    return [];
  }
}

// ====================================================================
// Ghi chú cho tính năng chat thời gian thực (REAL-TIME CHAT):
// Để có chat thời gian thực, một backend cần triển khai:
// 1. WebSocket Server (ví dụ: Socket.IO, ws module trong Node.js, Spring WebSocket trong Java).
// 2. Client sẽ kết nối đến WebSocket Server này khi vào màn hình chat.
// 3. Khi một tin nhắn được gửi (qua API hoặc WebSocket), backend sẽ lưu vào DB và sau đó
//    broadcast tin nhắn đó đến tất cả các client đang kết nối trong cùng phòng chat.
// 4. Client sẽ "lắng nghe" các sự kiện từ WebSocket và cập nhật UI ngay lập tức.
//
// Hiện tại, `fetchMessages` đang dùng polling. Để có real-time, cần thay thế/bổ sung với WebSockets.
// ====================================================================