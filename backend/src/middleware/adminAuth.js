const jwt = require('jsonwebtoken');

/**
 * Middleware autentikasi admin via JWT Bearer token
 */
const adminAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Token tidak ditemukan. Silakan login.' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.admin = decoded;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token kadaluarsa. Silakan login kembali.' });
        }
        return res.status(401).json({ success: false, message: 'Token tidak valid.' });
    }
};

/**
 * Middleware otorisasi khusus superadmin
 */
const requireSuperAdmin = (req, res, next) => {
    if (!req.admin || req.admin.role !== 'superadmin') {
        return res.status(403).json({
            success: false,
            message: 'Akses ditolak. Fitur ini hanya dapat diakses oleh Superadmin.'
        });
    }
    next();
};

module.exports = adminAuth;
module.exports.adminAuth = adminAuth;
module.exports.requireSuperAdmin = requireSuperAdmin;
