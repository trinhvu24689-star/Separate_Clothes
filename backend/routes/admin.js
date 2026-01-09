const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Utility function to convert DB user object to frontend-friendly format
const formatUserForFrontend = (user) => {
    if (!user) return null;
    const { password_hash, history, created_at, updated_at, ...rest } = user;
    return {
        ...rest,
        history: history || [], // Ensure history is an array
        createdAt: Number(created_at), // Convert bigint to number
        updatedAt: Number(updated_at), // Convert bigint to number
    };
};

// Utility function to convert DB frame object to frontend-friendly format
const formatFrameForFrontend = (frame) => {
    if (!frame) return null;
    const { created_at, updated_at, ...rest } = frame;
    return {
        ...rest,
        createdAt: Number(created_at), // Convert bigint to number
        updatedAt: Number(updated_at), // Convert bigint to number
    };
};

// [GET] /api/admin/users - Fetch all users
router.get('/users', verifyToken, authorizeRoles(['ADMIN', 'MODERATOR']), async (req, res) => {
    try {
        const usersResult = await db.query(
            `SELECT id, username, email, role, stars, daily_star_claimed, avatar_url, frame_id, history, google_id, facebook_id, created_at, updated_at
             FROM users ORDER BY created_at DESC`
        );
        res.json(usersResult.rows.map(formatUserForFrontend));
    } catch (err) {
        console.error('Error fetching all users:', err);
        res.status(500).json({ message: 'Server error fetching users.' });
    }
});

// [POST] /api/admin/users/:targetUserId/buff-stars - Buff stars for a user
router.post('/users/:targetUserId/buff-stars', verifyToken, authorizeRoles(['ADMIN']), async (req, res) => {
    const { targetUserId } = req.params;
    const { amount } = req.body; // adminId comes from JWT (req.userId)

    if (!amount || amount <= 0) {
        return res.status(400).json({ message: 'Invalid amount for star buff.' });
    }

    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        const updatedUserResult = await client.query(
            `UPDATE users SET stars = stars + $1, updated_at = EXTRACT(EPOCH FROM NOW()) * 1000 WHERE id = $2
             RETURNING id, username, email, role, stars, daily_star_claimed, avatar_url, frame_id, history, google_id, facebook_id, created_at, updated_at`,
            [amount, targetUserId]
        );

        const updatedUser = updatedUserResult.rows[0];
        if (!updatedUser) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Target user not found.' });
        }

        await client.query(
            `INSERT INTO admin_logs (admin_id, action, target_user_id, details, timestamp, created_at, updated_at)
             VALUES ($1, 'BUFF_STARS', $2, $3, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000)`,
            [req.userId, targetUserId, `Added ${amount} stars to user ${updatedUser.username}`]
        );

        await client.query('COMMIT');
        res.json(formatUserForFrontend(updatedUser));

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error buffing stars:', err);
        res.status(500).json({ message: 'Server error buffing stars.' });
    } finally {
        client.release();
    }
});

// [POST] /api/admin/users/:targetUserId/lock - Lock/Unlock user account
router.post('/users/:targetUserId/lock', verifyToken, authorizeRoles(['ADMIN', 'MODERATOR']), async (req, res) => {
    const { targetUserId } = req.params;
    const { isLocked } = req.body; // adminId comes from JWT (req.userId)

    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        const userResult = await client.query('SELECT role FROM users WHERE id = $1 FOR UPDATE', [targetUserId]);
        const user = userResult.rows[0];
        if (!user) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Target user not found.' });
        }

        let newRoleName = user.role;
        if (isLocked) {
            newRoleName = 'LOCKED';
        } else {
            // Attempt to revert to previous role, or default to GUEST if original role not found or if it was already LOCKED
            // Fetch the default 'GUEST' role name
            const guestRoleResult = await client.query("SELECT name FROM vip_tiers WHERE level = 0");
            const guestRoleName = guestRoleResult.rows[0]?.name || 'GUEST';

            // Find the tier just below the current level if it was a valid tier, otherwise default to GUEST.
            // This logic is a bit simplified; in a real app, you might store previous role or have a more robust unban system.
            if (user.role === 'LOCKED') { // If it was locked, revert to GUEST or its previous actual role (if stored)
                 newRoleName = guestRoleName;
            } else {
                newRoleName = user.role; // If not locked, just keep current role for unlock action
            }
        }


        const updatedUserResult = await client.query(
            `UPDATE users SET role = $1, updated_at = EXTRACT(EPOCH FROM NOW()) * 1000 WHERE id = $2
             RETURNING id, username, email, role, stars, daily_star_claimed, avatar_url, frame_id, history, google_id, facebook_id, created_at, updated_at`,
            [newRoleName, targetUserId]
        );

        const updatedUser = updatedUserResult.rows[0];
        if (!updatedUser) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'User not found or update failed.' });
        }

        await client.query(
            `INSERT INTO admin_logs (admin_id, action, target_user_id, details, timestamp, created_at, updated_at)
             VALUES ($1, $2, $3, $4, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000)`,
            [req.userId, isLocked ? 'LOCK_ACCOUNT' : 'UNLOCK_ACCOUNT', targetUserId, `Account ${updatedUser.username} was ${isLocked ? 'locked' : 'unlocked'}`]
        );

        await client.query('COMMIT');
        res.json(formatUserForFrontend(updatedUser));

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error locking account:', err);
        res.status(500).json({ message: 'Server error locking account.' });
    } finally {
        client.release();
    }
});

// [POST] /api/admin/users/:targetUserId/set-role - Set user's VIP role
router.post('/users/:targetUserId/set-role', verifyToken, authorizeRoles(['ADMIN']), async (req, res) => {
    const { targetUserId } = req.params;
    const { role } = req.body; // adminId comes from JWT (req.userId)

    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        const roleExists = await client.query('SELECT name FROM vip_tiers WHERE name = $1', [role]);
        if (roleExists.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Invalid VIP role name provided.' });
        }

        const updatedUserResult = await client.query(
            `UPDATE users SET role = $1, updated_at = EXTRACT(EPOCH FROM NOW()) * 1000 WHERE id = $2
             RETURNING id, username, email, role, stars, daily_star_claimed, avatar_url, frame_id, history, google_id, facebook_id, created_at, updated_at`,
            [role, targetUserId]
        );

        const updatedUser = updatedUserResult.rows[0];
        if (!updatedUser) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Target user not found or update failed.' });
        }

        await client.query(
            `INSERT INTO admin_logs (admin_id, action, target_user_id, details, timestamp, created_at, updated_at)
             VALUES ($1, 'CHANGE_ROLE', $2, $3, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000)`,
            [req.userId, targetUserId, `Changed role of user ${updatedUser.username} to ${role}`]
        );

        await client.query('COMMIT');
        res.json(formatUserForFrontend(updatedUser));

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error setting user role:', err);
        res.status(500).json({ message: 'Server error setting user role.' });
    } finally {
        client.release();
    }
});

// [POST] /api/admin/ai-create-frame - Create an AI avatar frame (simulated)
router.post('/ai-create-frame', verifyToken, authorizeRoles(['ADMIN']), async (req, res) => {
    const { prompt } = req.body; // adminId comes from JWT (req.userId)

    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        // Simulate AI generation (in a real app, this would call an external AI service)
        const newFrameId = uuidv4();
        const frameName = `AI Frame: ${prompt.substring(0, 20)}${prompt.length > 20 ? '...' : ''}`;
        const imageUrl = `https://via.placeholder.com/150/00FF00/000000?text=AI_Frame_${Math.floor(Math.random()*100)}`;
        const priceStars = 500;
        const minLevel = 6; // DAINHAN level
        const isExclusive = true;
        const description = `Frame generated by AI based on prompt: "${prompt}"`;

        const newFrameResult = await client.query(
            `INSERT INTO frames (id, name, image_url, price_stars, min_level, is_exclusive, description, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000)
             RETURNING id, name, image_url, price_stars, min_level, is_exclusive, description, created_at, updated_at`,
            [newFrameId, frameName, imageUrl, priceStars, minLevel, isExclusive, description]
        );

        const newFrame = newFrameResult.rows[0];

        await client.query(
            `INSERT INTO admin_logs (admin_id, action, details, timestamp, created_at, updated_at)
             VALUES ($1, 'CREATE_AI_FRAME', $2, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000)`,
            [req.userId, `AI created frame with prompt: "${prompt}", new frame ID: ${newFrame.id}`]
        );

        await client.query('COMMIT');
        res.status(201).json(formatFrameForFrontend(newFrame));

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error creating AI frame:', err);
        res.status(500).json({ message: 'Server error creating AI frame.' });
    } finally {
        client.release();
    }
});

module.exports = router;