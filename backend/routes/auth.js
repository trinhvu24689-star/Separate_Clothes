const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// Default avatar URL
const DEFAULT_AVATAR = 'https://via.placeholder.com/150/0000FF/FFFFFF?text=Guest';

// Utility function to convert DB user object to frontend-friendly format
const formatUserForFrontend = (user) => {
    const { password_hash, history, created_at, updated_at, ...rest } = user;
    return {
        ...rest,
        history: history || [], // Ensure history is an array
        createdAt: Number(created_at), // Convert bigint to number
        updatedAt: Number(updated_at), // Convert bigint to number
    };
};

// [POST] /api/auth/register
router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        const hashedPassword = await bcrypt.hash(password, 10);

        // Check if username already exists
        const existingUser = await client.query('SELECT id FROM users WHERE username = $1', [username]);
        if (existingUser.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ message: 'Username already exists' });
        }

        // Get default frame_id and guest role details
        const defaultFrameResult = await client.query("SELECT id FROM frames WHERE name = 'Mặc định'");
        if (defaultFrameResult.rows.length === 0) {
            await client.query('ROLLBACK');
            console.error('Default frame not found in DB.');
            return res.status(500).json({ message: 'Server configuration error: Default frame missing.' });
        }
        const defaultFrameId = defaultFrameResult.rows[0].id;

        const guestRoleResult = await client.query("SELECT name FROM vip_tiers WHERE level = 0");
        if (guestRoleResult.rows.length === 0) {
            await client.query('ROLLBACK');
            console.error('Guest VIP tier not found in DB.');
            return res.status(500).json({ message: 'Server configuration error: Guest role missing.' });
        }
        const guestRoleName = guestRoleResult.rows[0].name;

        // Insert new user with bigint timestamps
        const newUserResult = await client.query(
            `INSERT INTO users (id, username, password_hash, role, stars, daily_star_claimed, avatar_url, frame_id, history, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, '[]'::jsonb, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000)
             RETURNING id, username, email, role, stars, daily_star_claimed, avatar_url, frame_id, history, google_id, facebook_id, created_at, updated_at`,
            [uuidv4(), username, hashedPassword, guestRoleName, 50, '', DEFAULT_AVATAR, defaultFrameId]
        );

        await client.query('COMMIT');

        const user = formatUserForFrontend(newUserResult.rows[0]);
        const token = jwt.sign({ id: user.id, role: user.role, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' }); // Add username to JWT

        res.status(201).json({ user, token });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Registration error:', err);
        res.status(500).json({ message: 'Server error during registration' });
    } finally {
        client.release();
    }
});

// [POST] /api/auth/login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    try {
        const userResult = await db.query(
            `SELECT id, username, password_hash, email, role, stars, daily_star_claimed, avatar_url, frame_id, history, google_id, facebook_id, created_at, updated_at
             FROM users WHERE username = $1`,
            [username]
        );

        const user = userResult.rows[0];
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        const formattedUser = formatUserForFrontend(user);
        const token = jwt.sign({ id: formattedUser.id, role: formattedUser.role, username: formattedUser.username }, process.env.JWT_SECRET, { expiresIn: '1h' }); // Add username to JWT

        res.status(200).json({ user: formattedUser, token });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Server error during login' });
    }
});

// [POST] /api/auth/admin-login - Admin Login (client-side hardcoded for demo, real would be different)
router.post('/admin-login', async (req, res) => {
    const { username, password } = req.body;
    // For demo purposes, this uses the hardcoded admin credentials from appUtils.ts conceptually.
    // In a real app, you would have dedicated admin accounts with proper roles in the DB.
    if (username === 'Quang Tiger Master G' && password === 'Volkath666') {
        try {
            const userResult = await db.query(
                `SELECT id, username, password_hash, email, role, stars, daily_star_claimed, avatar_url, frame_id, history, google_id, facebook_id, created_at, updated_at
                 FROM users WHERE username = $1`,
                [username]
            );
            const user = userResult.rows[0];
            if (!user) {
                return res.status(404).json({ message: 'Admin user not found in DB.' });
            }
            const formattedUser = formatUserForFrontend(user);
            const token = jwt.sign({ id: formattedUser.id, role: formattedUser.role, username: formattedUser.username }, process.env.JWT_SECRET, { expiresIn: '1h' });
            return res.status(200).json({ user: formattedUser, token });
        } catch (err) {
            console.error('Admin login DB error:', err);
            return res.status(500).json({ message: 'Server error during admin login.' });
        }
    }
    return res.status(401).json({ message: 'Invalid admin credentials' });
});


// [POST] /api/auth/google - Social login/registration via Google
router.post('/google', async (req, res) => {
    const { googleId, username, email } = req.body;
    if (!googleId || !username || !email) {
        return res.status(400).json({ message: 'Google ID, username, and email are required.' });
    }

    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        let userResult = await client.query(
            `SELECT id, username, email, role, stars, daily_star_claimed, avatar_url, frame_id, history, google_id, facebook_id, created_at, updated_at
             FROM users WHERE google_id = $1`,
            [googleId]
        );

        let user = userResult.rows[0];
        if (!user) {
            // User does not exist, create new account
            const defaultFrameResult = await client.query("SELECT id FROM frames WHERE name = 'Mặc định'");
            const defaultFrameId = defaultFrameResult.rows[0]?.id || null;

            const guestRoleResult = await client.query("SELECT name FROM vip_tiers WHERE level = 0");
            const guestRoleName = guestRoleResult.rows[0]?.name || 'GUEST';

            const newUserResult = await client.query(
                `INSERT INTO users (id, username, email, role, stars, daily_star_claimed, avatar_url, frame_id, history, google_id, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, '[]'::jsonb, $9, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000)
                 RETURNING id, username, email, role, stars, daily_star_claimed, avatar_url, frame_id, history, google_id, facebook_id, created_at, updated_at`,
                [uuidv4(), username, email, guestRoleName, 50, '', DEFAULT_AVATAR, defaultFrameId, googleId]
            );
            user = newUserResult.rows[0];
        } else {
            // User exists, update last login time or other details if necessary
            await client.query(
                `UPDATE users SET updated_at = EXTRACT(EPOCH FROM NOW()) * 1000 WHERE id = $1`,
                [user.id]
            );
        }

        await client.query('COMMIT');

        const formattedUser = formatUserForFrontend(user);
        const token = jwt.sign({ id: formattedUser.id, role: formattedUser.role, username: formattedUser.username }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({ user: formattedUser, token });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Google social login error:', err);
        res.status(500).json({ message: 'Server error during Google login' });
    } finally {
        client.release();
    }
});

// [POST] /api/auth/facebook - Social login/registration via Facebook
router.post('/facebook', async (req, res) => {
    const { facebookId, username, email } = req.body;
    if (!facebookId || !username || !email) {
        return res.status(400).json({ message: 'Facebook ID, username, and email are required.' });
    }

    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        let userResult = await client.query(
            `SELECT id, username, email, role, stars, daily_star_claimed, avatar_url, frame_id, history, google_id, facebook_id, created_at, updated_at
             FROM users WHERE facebook_id = $1`,
            [facebookId]
        );

        let user = userResult.rows[0];
        if (!user) {
            // User does not exist, create new account
            const defaultFrameResult = await client.query("SELECT id FROM frames WHERE name = 'Mặc định'");
            const defaultFrameId = defaultFrameResult.rows[0]?.id || null;

            const guestRoleResult = await client.query("SELECT name FROM vip_tiers WHERE level = 0");
            const guestRoleName = guestRoleResult.rows[0]?.name || 'GUEST';

            const newUserResult = await client.query(
                `INSERT INTO users (id, username, email, role, stars, daily_star_claimed, avatar_url, frame_id, history, facebook_id, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, '[]'::jsonb, $9, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000)
                 RETURNING id, username, email, role, stars, daily_star_claimed, avatar_url, frame_id, history, google_id, facebook_id, created_at, updated_at`,
                [uuidv4(), username, email, guestRoleName, 50, '', DEFAULT_AVATAR, defaultFrameId, facebookId]
            );
            user = newUserResult.rows[0];
        } else {
            // User exists, update last login time or other details if necessary
            await client.query(
                `UPDATE users SET updated_at = EXTRACT(EPOCH FROM NOW()) * 1000 WHERE id = $1`,
                [user.id]
            );
        }

        await client.query('COMMIT');

        const formattedUser = formatUserForFrontend(user);
        const token = jwt.sign({ id: formattedUser.id, role: formattedUser.role, username: formattedUser.username }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({ user: formattedUser, token });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Facebook social login error:', err);
        res.status(500).json({ message: 'Server error during Facebook login' });
    } finally {
        client.release();
    }
});

// [POST] /api/auth/forgot-password - Simulate password reset request
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    // In a real application, this would send a password reset email.
    // For this demo, we'll just acknowledge the request.
    console.log(`Password reset requested for: ${email}`);
    res.status(