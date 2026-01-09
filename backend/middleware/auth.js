const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(403).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1]; // Expects "Bearer TOKEN"
    if (!token) {
        return res.status(403).json({ message: 'Malformed token' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            console.error('JWT verification failed:', err);
            return res.status(401).json({ message: 'Unauthorized: Invalid token' });
        }
        req.userId = decoded.id;
        req.userRole = decoded.role;
        req.username = decoded.username; // Add username to req object
        next();
    });
};

const authorizeRoles = (roles) => (req, res, next) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
        return res.status(403).json({ message: 'Forbidden: You do not have the required permissions.' });
    }
    next();
};

module.exports = {
    verifyToken,
    authorizeRoles,
};