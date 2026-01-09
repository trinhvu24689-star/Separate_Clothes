const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');
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

// [GET] /api/shop/star-packs - Fetch all star packs (Public access, but can be restricted)
router.get('/star-packs', async (req, res) => {
    try {
        const result = await db.query('SELECT id, amount, price_vnd, price_usd, created_at, updated_at FROM star_packs ORDER BY amount ASC');
        res.json(result.rows.map(formatStarPackForFrontend));
    } catch (err) {
        console.error('Error fetching star packs:', err);
        res.status(500).json({ message: 'Server error fetching star packs.' });
    }
});

// [POST] /api/shop/buy-stars - Buy a star pack
router.post('/buy-stars', verifyToken, async (req, res) => {
    const { userId, packId } = req.body;
    if (req.userId !== userId) {
        return res.status(403).json({ message: 'Forbidden: You can only buy stars for your own account.' });
    }

    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        const packResult = await client.query('SELECT amount, price_vnd FROM star_packs WHERE id = $1', [packId]);
        const starPack = packResult.rows[0];
        if (!starPack) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Star pack not found.' });
        }

        // --- Simulate Payment Gateway Interaction ---
        // In a real application, you would integrate with a payment gateway here.
        // For this example, we'll simulate a successful payment.
        const paymentSuccessful = true; // This needs to be replaced with actual payment logic
        // ------------------------------------------

        if (!paymentSuccessful) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Payment failed. Please try again.' });
        }

        const updatedUserResult = await client.query(
            `UPDATE users SET stars = stars + $1, updated_at = EXTRACT(EPOCH FROM NOW()) * 1000 WHERE id = $2
             RETURNING id, username, email, role, stars, daily_star_claimed, avatar_url, frame_id, history, google_id, facebook_id, created_at, updated_at`,
            [starPack.amount, userId]
        );

        await client.query(
            `INSERT INTO transactions (user_id, type, item_id, amount, currency, status, details, created_at, updated_at)
             VALUES ($1, 'BUY_STARS', $2, $3, 'VND', 'COMPLETED', 'Payment for ' || $4 || ' stars', EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000)`,
            [userId, packId, starPack.price_vnd, starPack.amount]
        );

        await client.query('COMMIT');
        res.json(formatUserForFrontend(updatedUserResult.rows[0]));

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error buying stars:', err);
        res.status(500).json({ message: 'Server error buying stars.' });
    } finally {
        client.release();
    }
});

// [POST] /api/shop/upgrade-vip - Upgrade VIP tier
router.post('/upgrade-vip', verifyToken, async (req, res) => {
    const { userId, vipTierId } = req.body;
    if (req.userId !== userId) {
        return res.status(403).json({ message: 'Forbidden: You can only upgrade VIP for your own account.' });
    }

    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        const userResult = await client.query('SELECT role FROM users WHERE id = $1 FOR UPDATE', [userId]);
        const user = userResult.rows[0];
        if (!user) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'User not found.' });
        }

        const vipTierResult = await client.query('SELECT id, name, level, price_vnd FROM vip_tiers WHERE id = $1', [vipTierId]);
        const vipTier = vipTierResult.rows[0];
        if (!vipTier) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'VIP tier not found.' });
        }

        const currentUserRoleResult = await client.query('SELECT level FROM vip_tiers WHERE name = $1', [user.role]);
        const currentUserLevel = currentUserRoleResult.rows[0]?.level || 0;

        if (currentUserLevel >= vipTier.level) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: `Bạn đã có gói ${user.role} hoặc gói cao hơn.` });
        }

        // --- Simulate Payment Gateway Interaction ---
        const paymentSuccessful = true; // Replace with actual payment logic
        // ------------------------------------------

        if (!paymentSuccessful) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Payment failed. Please try again.' });
        }

        const updatedUserResult = await client.query(
            `UPDATE users SET role = $1, updated_at = EXTRACT(EPOCH FROM NOW()) * 1000 WHERE id = $2
             RETURNING id, username, email, role, stars, daily_star_claimed, avatar_url, frame_id, history, google_id, facebook_id, created_at, updated_at`,
            [vipTier.name, userId]
        );

        await client.query(
            `INSERT INTO transactions (user_id, type, item_id, amount, currency, status, details, created_at, updated_at)
             VALUES ($1, 'UPGRADE_VIP', $2, $3, 'VND', 'COMPLETED', 'Upgrade to ' || $4, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000)`,
            [userId, vipTier.id, vipTier.price_vnd || 0, vipTier.name]
        );

        await client.query('COMMIT');
        res.json(formatUserForFrontend(updatedUserResult.rows[0]));

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error upgrading VIP:', err);
        res.status(500).json({ message: 'Server error upgrading VIP.' });
    } finally {
        client.release();
    }
});

// [POST] /api/shop/buy-frame - Buy an avatar frame
router.post('/buy-frame', verifyToken, async (req, res) => {
    const { userId, frameId } = req.body;
    if (req.userId !== userId) {
        return res.status(403).json({ message: 'Forbidden: You can only buy frames for your own account.' });
    }

    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        const userResult = await client.query('SELECT stars, role, frame_id FROM users WHERE id = $1 FOR UPDATE', [userId]);
        const user = userResult.rows[0];
        if (!user) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'User not found.' });
        }

        const frameResult = await client.query('SELECT id, name, price_stars, min_level FROM frames WHERE id = $1', [frameId]);
        const frame = frameResult.rows[0];
        if (!frame) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Frame not found.' });
        }

        if (user.frame_id === frame.id) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Bạn đã sở hữu khung này.' });
        }

        const currentUserRoleResult = await client.query('SELECT level FROM vip_tiers WHERE name = $1', [user.role]);
        const currentUserLevel = currentUserRoleResult.rows[0]?.level || 0;

        if (currentUserLevel < frame.min_level) {
            await client.query('ROLLBACK');
            return res.status(403).json({ message: `Cần VIP cấp ${frame.min_level} để mua khung này.` });
        }

        // Admin/Lifetime users are exempt from star costs
        const adminLevelResult = await client.query("SELECT level FROM vip_tiers WHERE name = 'ADMIN'");
        const adminLevel = adminLevelResult.rows[0]?.level || 99;
        const lifetimeLevelResult = await client.query("SELECT level FROM vip_tiers WHERE name = 'LIFETIME'");
        const lifetimeLevel = lifetimeLevelResult.rows[0]?.level || 19;

        const cost = (currentUserLevel >= adminLevel || currentUserLevel >= lifetimeLevel) ? 0 : frame.price_stars;

        if (user.stars < cost) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Bạn không đủ sao để mua khung này.' });
        }

        const updatedUserResult = await client.query(
            `UPDATE users SET stars = stars - $1, frame_id = $2, updated_at = EXTRACT(EPOCH FROM NOW()) * 1000 WHERE id = $3
             RETURNING id, username, email, role, stars, daily_star_claimed, avatar_url, frame_id, history, google_id, facebook_id, created_at, updated_at`,
            [cost, frame.id, userId]
        );

        await client.query(
            `INSERT INTO transactions (user_id, type, item_id, amount, currency, status, details, created_at, updated_at)
             VALUES ($1, 'BUY_FRAME', $2, $3, 'STARS', 'COMPLETED', 'Bought frame: ' || $4, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000)`,
            [userId, frame.id, cost, frame.name]
        );

        await client.query('COMMIT');
        res.json(formatUserForFrontend(updatedUserResult.rows[0]));

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error buying frame:', err);
        res.status(500).json({ message: 'Server error buying frame.' });
    } finally {
        client.release();
    }
});

module.exports = router;