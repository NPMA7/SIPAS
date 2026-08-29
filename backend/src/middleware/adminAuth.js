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

/**
 * Middleware untuk memblokir aksi perubahan data (write/delete) bagi role visitor
 */
const preventVisitorMutation = (req, res, next) => {
    if (req.admin && req.admin.role === 'visitor') {
        return res.status(403).json({
            success: false,
            message: 'Aksi ditolak. Akun dengan role Visitor hanya memiliki akses Read-Only.'
        });
    }
    next();
};

/**
 * Helper fungsi untuk menyamarkan data sensitif jika role adalah visitor
 */
const maskSensitiveText = (text, keepStart = 3, keepEnd = 3) => {
    if (!text || typeof text !== 'string') return text;
    const trimmed = text.trim();
    if (trimmed.length <= keepStart + keepEnd) {
        return trimmed.length > 2 ? `${trimmed[0]}***${trimmed[trimmed.length - 1]}` : '***';
    }
    return `${trimmed.substring(0, keepStart)}****${trimmed.substring(trimmed.length - keepEnd)}`;
};

module.exports = adminAuth;
module.exports.adminAuth = adminAuth;
module.exports.requireSuperAdmin = requireSuperAdmin;
module.exports.preventVisitorMutation = preventVisitorMutation;
module.exports.maskSensitiveText = maskSensitiveText;
