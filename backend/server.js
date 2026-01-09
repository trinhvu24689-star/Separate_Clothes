require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const shopRoutes = require('./routes/shop');
const adminRoutes = require('./routes/admin');
const chatRoutes = require('./routes/chat');
const db = require('./db'); // Ensure DB connection is initialized

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: 'http://localhost:8080', // Thay thế bằng URL frontend của bạn
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(bodyParser.json({ limit: '50mb' })); // Tăng giới hạn cho Base64 image
app.use(bodyParser.urlencoded({ extended: true }));

// Test DB connection
(async () => {
    try {
        const client = await db.getClient();
        client.release();
        console.log('Database connection successful!');
    } catch (err) {
        console.error('Database connection failed:', err);
        process.exit(1);
    }
})();

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);

// Basic route for testing server status
app.get('/', (req, res) => {
    res.send('Separate Clothes Backend API is running!');
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke on the server!');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});