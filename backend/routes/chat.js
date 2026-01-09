const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Utility function to convert DB chat message object to frontend-friendly format
const formatChatMessageForFrontend = (message) => {
    if (!message) return null;
    const { created_at, updated_at, timestamp, ...rest } = message;
    return {
        ...rest,
        timestamp: Number(timestamp), // Convert bigint to number
        createdAt: Number(created_at), // Convert bigint to number
        updatedAt: Number(updated_at), // Convert bigint to number
    };
};

// [POST] /api/chat/send-message - Send a new chat message
router.post('/send-message', verifyToken, async (req, res) => {
    const { content, roomId } = req.body;
    const senderId = req.userId;
    const senderUsername = req.username; // Assuming username is also decoded in JWT or fetched
    const senderRole = req.userRole;

    if (!content) {
        return res.status(400).json({ message: 'Message content cannot be empty.' });
    }

    try {
        // Here you would also add rate limiting based on userRole, if implemented
        // For example, checking if the user has exceeded their daily message limit or cooldown

        const newMessageResult = await db.query(
            `INSERT INTO chat_messages (id, sender_id, sender_username, sender_role, content, timestamp, room_id, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, EXTRACT(EPOCH FROM NOW()) * 1000, $6, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000)
             RETURNING id, sender_id, sender_username, sender_role, content, timestamp, room_id, created_at, updated_at`,
            [uuidv4(), senderId, senderUsername || 'Unknown User', senderRole, content, roomId]
        );

        const newMessage = formatChatMessageForFrontend(newMessageResult.rows[0]);
        // In a real WebSocket setup, you would now broadcast this message to connected clients
        console.log(`[Chat Backend] Message sent by ${senderUsername}: "${content}"`);
        res.status(201).json(newMessage);

    } catch (err) {
        console.error('Error sending chat message:', err);
        res.status(500).json({ message: 'Server error sending message.' });
    }
});

// [GET] /api/chat/messages - Fetch chat history
router.get('/messages', verifyToken, async (req, res) => {
    const { roomId, limit = 50, offset = 0 } = req.query;

    try {
        let query = `
            SELECT id, sender_id, sender_username, sender_role, content, timestamp, room_id, created_at, updated_at
            FROM chat_messages
        `;
        const params = [];
        let paramIndex = 1;

        if (roomId) {
            query += ` WHERE room_id = $${paramIndex++}`;
            params.push(roomId);
        } else {
            query += ` WHERE room_id IS NULL`; // Assuming NULL for public chat
        }

        query += ` ORDER BY timestamp ASC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(parseInt(limit), parseInt(offset));

        const messagesResult = await db.query(query, params);
        res.json(messagesResult.rows.map(formatChatMessageForFrontend));

    } catch (err) {
        console.error('Error fetching chat messages:', err);
        res.status(500).json({ message: 'Server error fetching messages.' });
    }
});

// ====================================================================
// Ghi chú cho tính năng chat thời gian thực (REAL-TIME CHAT):
// Để có chat thời gian thực, bạn cần bổ sung:
// 1. WebSocket Server: Sử dụng thư viện như `socket.io` trong `server.js`.
// 2. Client-side WebSocket connection: Frontend sẽ kết nối tới WebSocket Server.
// 3. Server-side broadcasting: Khi một tin nhắn được gửi (qua POST /send-message),
//    server sẽ phát sóng (broadcast) tin nhắn đó qua WebSocket tới tất cả các client
//    đang kết nối trong cùng một phòng chat.
// 4. Client-side listener: Frontend sẽ lắng nghe các tin nhắn từ WebSocket
//    và cập nhật UI ngay lập tức.
// ====================================================================

module.exports = router;