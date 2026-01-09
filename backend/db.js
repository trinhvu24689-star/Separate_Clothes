require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        // Tùy chỉnh cấu hình SSL cho Neon, nếu cần.
        // Đối với Neon, thường chỉ cần `true` hoặc một đối tượng rỗng nếu không có chứng chỉ cụ thể.
        rejectUnauthorized: false // Chỉ sử dụng trong môi trường dev nếu bạn gặp lỗi self-signed cert
    }
});

// Kiểm tra kết nối DB
pool.on('connect', () => {
    console.log('Connected to the database');
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    getClient: () => pool.connect(),
};