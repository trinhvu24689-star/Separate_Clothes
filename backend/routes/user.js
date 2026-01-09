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

// Utility function to convert DB vip_tier object to frontend-friendly format
const formatVipTierForFrontend = (tier) => {
    if (!tier) return null;
    const { created_at, updated_at, benefits, ...rest } = tier;
    // benefits is JSONB in DB, pg driver usually parses it to JS array.
    // Add a fallback to JSON.parse if it comes as a string.
    return {
        ...rest,
        benefits: Array.isArray(benefits) ? benefits : JSON.parse(benefits || '[]'),
        createdAt: Number(created_at), // Convert bigint to number
        updatedAt: Number(updated_at), // Convert bigint to number
    };
};

// Utility function to convert DB star_pack object to frontend-friendly format
const formatStarPackForFrontend = (pack) => {
    if (!pack) return null;
    const { created_at, updated_at, ...rest } = pack;
    return {
        ...rest,
        createdAt: Number(created_at), // Convert bigint to number
        updatedAt: Number(updated_at), // Convert bigint to number
    };
};

// Utility function to convert DB chat_message object to frontend-friendly format
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


// [GET] /api/user/:userId - Fetch user profile
router.get('/:userId', verifyToken, async (req, res) => {
    const { userId } = req.params;
    // Ensure the token's user ID matches the requested user ID, or the user is Admin
    if (req.userId !== userId && req.userRole !== 'ADMIN') {
        return res.status(403).json({ message: 'Forbidden: You can only view your own profile.' });
    }

    try {
        const userResult = await db.query(
            `SELECT id, username, email, role, stars, daily_star_claimed, avatar_url, frame_id, history, google_id, facebook_id, created_at, updated_at
             FROM users WHERE id = $1`,
            [userId]
        );

        const user = userResult.rows[0];
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(formatUserForFrontend(user));

    } catch (err) {
        console.error('Error fetching user profile:', err);
        res.status(500).json({ message: 'Server error fetching user profile' });
    }
});

// [PUT] /api/user/:userId/profile - Update user profile
router.put('/:userId/profile', verifyToken, async (req, res) => {
    const { userId } = req.params;
    const { avatarUrl, frameId } = req.body; // Add other updatable fields as needed

    if (req.userId !== userId) {
        return res.status(403).json({ message: 'Forbidden: You can only update your own profile.' });
    }

    let updateFields = [];
    let queryParams = [userId];
    let paramIndex = 2; // Start index for dynamic parameters

    if (avatarUrl) {
        updateFields.push(`avatar_url = $${paramIndex++}`);
        queryParams.push(avatarUrl);
    }
    if (frameId) {
        // Validate frameId exists
        const frameExists = await db.query('SELECT id FROM frames WHERE id = $1', [frameId]);
        if (frameExists.rows.length === 0) {
            return res.status(400).json({ message: 'Invalid frame ID provided.' });
        }
        updateFields.push(`frame_id = $${paramIndex++}`);
        queryParams.push(frameId);
    }

    if (updateFields.length === 0) {
        return res.status(400).json({ message: 'No fields to update' });
    }

    try {
        const updatedUserResult = await db.query(
            `UPDATE users SET ${updateFields.join(', ')}, updated_at = EXTRACT(EPOCH FROM NOW()) * 1000 WHERE id = $1
             RETURNING id, username, email, role, stars, daily_star_claimed, avatar_url, frame_id, history, google_id, facebook_id, created_at, updated_at`,
            queryParams
        );

        const updatedUser = updatedUserResult.rows[0];
        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found or update failed' });
        }
        res.json(formatUserForFrontend(updatedUser));

    } catch (err) {
        console.error('Error updating user profile:', err);
        res.status(500).json({ message: 'Server error updating profile' });
    }
});

// [POST] /api/user/:userId/deduct-stars - Deduct stars
router.post('/:userId/deduct-stars', verifyToken, async (req, res) => {
    const { userId } = req.params;
    const { amount, reason } = req.body;

    if (req.userId !== userId && req.userRole !== 'ADMIN') {
        return res.status(403).json({ message: 'Forbidden: You can only deduct stars from your own account or as an Admin.' });
    }
    if (!amount || amount <= 0) {
        return res.status(400).json({ message: 'Invalid amount for star deduction.' });
    }

    const client = await db.getClient();
    try {
        await client.query('BEGIN'); // Start transaction

        const userResult = await client.query('SELECT stars, role FROM users WHERE id = $1 FOR UPDATE', [userId]);
        const user = userResult.rows[0];
        if (!user) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'User not found.' });
        }

        // Fetch VIP level for the user's role
        const userRoleLevelResult = await client.query('SELECT level FROM vip_tiers WHERE name = $1', [user.role]);
        const userRoleLevel = userRoleLevelResult.rows[0]?.level || 0;

        // Admin and Lifetime users are exempt from star deductions (using hardcoded levels for ADMIN/LIFETIME)
        // In a real app, you'd fetch these levels from the DB as well.
        // Assuming ADMIN level is 99 and LIFETIME is 19 as per frontend schema.
        const adminLevelResult = await client.query("SELECT level FROM vip_tiers WHERE name = 'ADMIN'");
        const adminLevel = adminLevelResult.rows[0]?.level || 99; // Default if not found
        const lifetimeLevelResult = await client.query("SELECT level FROM vip_tiers WHERE name = 'LIFETIME'");
        const lifetimeLevel = lifetimeLevelResult.rows[0]?.level || 19; // Default if not found


        if (userRoleLevel >= adminLevel || userRoleLevel >= lifetimeLevel) {
             await client.query('COMMIT');
             // Return user's current data as no stars were deducted
             const exemptionUserResult = await db.query(
                `SELECT id, username, email, role, stars, daily_star_claimed, avatar_url, frame_id, history, google_id, facebook_id, created_at, updated_at
                 FROM users WHERE id = $1`, [userId]
             );
             return res.json(formatUserForFrontend(exemptionUserResult.rows[0]));
        }

        if (user.stars < amount) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Insufficient stars.' });
        }

        const updatedUserResult = await client.query(
            `UPDATE users SET stars = stars - $1, updated_at = EXTRACT(EPOCH FROM NOW()) * 1000 WHERE id = $2
             RETURNING id, username, email, role, stars, daily_star_claimed, avatar_url, frame_id, history, google_id, facebook_id, created_at, updated_at`,
            [amount, userId]
        );

        await client.query(
            `INSERT INTO transactions (user_id, type, amount, currency, status, details, created_at, updated_at)
             VALUES ($1, 'DEDUCT_STARS', $2, 'STARS', 'COMPLETED', $3, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000)`,
            [userId, amount, reason || 'Star deduction']
        );

        await client.query('COMMIT'); // End transaction
        res.json(formatUserForFrontend(updatedUserResult.rows[0]));

    } catch (err) {
        await client.query('ROLLBACK'); // Rollback on error
        console.error('Error deducting stars:', err);
        res.status(500).json({ message: 'Server error deducting stars' });
    } finally {
        client.release();
    }
});

// [POST] /api/user/:userId/claim-daily-stars - Claim daily free stars
router.post('/:userId/claim-daily-stars', verifyToken, async (req, res) => {
    const { userId } = req.params;

    if (req.userId !== userId) {
        return res.status(403).json({ message: 'Forbidden: You can only claim stars for your own account.' });
    }

    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        const userResult = await client.query('SELECT stars, daily_star_claimed, role FROM users WHERE id = $1 FOR UPDATE', [userId]);
        const user = userResult.rows[0];
        if (!user) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'User not found.' });
        }

        const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
        if (user.daily_star_claimed === today) {
            await client.query('ROLLBACK');
            return res.status(409).json({ message: 'Daily stars already claimed today.' });
        }

        const vipTierResult = await client.query('SELECT benefits FROM vip_tiers WHERE name = $1', [user.role]);
        const vipBenefits = vipTierResult.rows[0]?.benefits || [];

        let starsToAdd = 30; // Default for GUEST
        let maxStars = 69;   // Default for GUEST

        // benefits is JSONB, so it might be a JSON string or already parsed array
        const parsedBenefits = Array.isArray(vipBenefits) ? vipBenefits : JSON.parse(vipBenefits || '[]');

        const benefitMatch = parsedBenefits.find(b => b.includes('sao miễn phí mỗi ngày (tối đa'));
        if (benefitMatch) {
            const match = benefitMatch.match(/\+(\d+) sao miễn phí mỗi ngày \(tối đa (\d+) sao\)/);
            if (match) {
                starsToAdd = parseInt(match[1], 10);
                maxStars = parseInt(match[2], 10);
            }
        }

        let newStars = user.stars + starsToAdd;
        if (newStars > maxStars) {
            newStars = maxStars;
        }

        const updatedUserResult = await client.query(
            `UPDATE users SET stars = $1, daily_star_claimed = $2, updated_at = EXTRACT(EPOCH FROM NOW()) * 1000 WHERE id = $3
             RETURNING id, username, email, role, stars, daily_star_claimed, avatar_url, frame_id, history, google_id, facebook_id, created_at, updated_at`,
            [newStars, today, userId]
        );

        await client.query('COMMIT');
        res.json(formatUserForFrontend(updatedUserResult.rows[0]));

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error claiming daily stars:', err);
        res.status(500).json({ message: 'Server error claiming daily stars.' });
    } finally {
        client.release();
    }
});

// [POST] /api/user/:userId/history - Add image to history
router.post('/:userId/history', verifyToken, async (req, res) => {
    const { userId } = req.params;
    const { thumbnailUrl, originalPrompt, processedAt, resolutionUsed, costStars } = req.body; // processedAt is a number from frontend

    if (req.userId !== userId) {
        return res.status(403).json({ message: 'Forbidden: You can only add history for your own account.' });
    }
    if (!thumbnailUrl || !resolutionUsed || costStars === undefined || !processedAt) {
        return res.status(400).json({ message: 'Missing required history fields.' });
    }

    try {
        const currentTimestamp = Date.now(); // Unix timestamp in milliseconds (number)
        const newHistoryEntry = {
            id: uuidv4(),
            userId: userId, // Ensure userId is included in the entry
            thumbnailUrl: thumbnailUrl,
            originalPrompt: originalPrompt,
            processedAt: processedAt, // Already a number from frontend
            resolutionUsed: resolutionUsed,
            costStars: costStars,
            createdAt: currentTimestamp, // Store as number
            updatedAt: currentTimestamp, // Store as number
        };

        // Append new entry to history JSONB array, limit to 20 entries
        // Sort by processedAt (number) in descending order.
        const updatedUserResult = await db.query(
            `UPDATE users
             SET history = (
                 SELECT jsonb_agg(entry ORDER BY (entry->>'processedAt')::bigint DESC)
                 FROM (
                     SELECT jsonb_array_elements(history) AS entry FROM users WHERE id = $1
                     UNION ALL
                     SELECT $2::jsonb AS entry
                 ) AS combined_history
             ),
             updated_at = EXTRACT(EPOCH FROM NOW()) * 1000
             WHERE id = $1
             RETURNING id, username, email, role, stars, daily_star_claimed, avatar_url, frame_id, history, google_id, facebook_id, created_at, updated_at`,
            [userId, JSON.stringify(newHistoryEntry)]
        );

        const updatedUser = updatedUserResult.rows[0];
        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found or history update failed.' });
        }
        res.json(formatUserForFrontend(updatedUser));

    } catch (err) {
        console.error('Error adding image to history:', err);
        res.status(500).json({ message: 'Server error adding image to history.' });
    }
});


// [GET] /api/user/frames - Fetch all frames (Public access, but can be restricted)
router.get('/frames', async (req, res) => {
    try {
        const framesResult = await db.query('SELECT id, name, image_url, price_stars, min_level, is_exclusive, description, created_at, updated_at FROM frames ORDER BY min_level ASC');
        res.json(framesResult.rows.map(formatFrameForFrontend));
    } catch (err) {
        console.error('Error fetching frames:', err);
        res.status(500).json({ message: 'Server error fetching frames.' });
    }
});

// [GET] /api/user/vip-tiers - Fetch all VIP tiers (Public access, but can be restricted)
router.get('/vip-tiers', async (req, res) => {
    try {
        const vipTiersResult = await db.query('SELECT id, name, level, description, price_vnd, price_usd, benefits, duration, created_at, updated_at FROM vip_tiers ORDER BY level ASC');
        res.json(vipTiersResult.rows.map(formatVipTierForFrontend));
    } catch (err) {
        console.error('Error fetching VIP tiers:', err);
        res.status(500).json({ message: 'Server error fetching VIP tiers.' });
    }
});


module.exports = router;