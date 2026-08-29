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

/**
 * Universal Response Sanitizer for Visitor role
 * Sanitizes IP addresses, MAC addresses, serial numbers, hardware models, versions, usernames, and hostnames recursively
 */
const sanitizeVisitorData = (data) => {
    if (data === null || data === undefined) return data;
    if (typeof data !== 'object') return data;

    if (Array.isArray(data)) {
        return data.map(item => sanitizeVisitorData(item));
    }

    const sanitized = {};
    for (const [key, val] of Object.entries(data)) {
        const lowerKey = key.toLowerCase().replace(/[-_]/g, '');

        // Preserve Date and Timestamp fields intact
        if (lowerKey.includes('date') || lowerKey.includes('seen') || lowerKey.includes('created') || lowerKey.includes('updated') || lowerKey.includes('time')) {
            sanitized[key] = val;
            continue;
        }

        if (typeof val === 'string' && val.trim() !== '') {
            // 1. Password fields (Always obscure)
            if (lowerKey.includes('password')) {
                sanitized[key] = '••••••••';
                continue;
            }

            // 2. API username (Router Mikrotik)
            if (lowerKey === 'apiusername') {
                sanitized[key] = maskSensitiveText(val, 1, 1);
                continue;
            }

            // 3. Usernames & NIP
            if (lowerKey === 'nip' || lowerKey === 'username' || lowerKey === 'user' || (lowerKey === 'name' && !val.startsWith('Router-') && !val.startsWith('hotspot-') && !val.startsWith('default'))) {
                if (/^\d{8,}$/.test(val.trim())) {
                    sanitized[key] = maskSensitiveText(val, 4, 3);
                } else {
                    sanitized[key] = maskSensitiveText(val, 1, 1);
                }
                continue;
            }

            // 4. Phone numbers & Emails
            if (lowerKey.includes('phone')) {
                sanitized[key] = maskSensitiveText(val, 3, 2);
                continue;
            }
            if (lowerKey.includes('email') && val.includes('@')) {
                sanitized[key] = maskSensitiveText(val, 2, 4);
                continue;
            }

            // 5. MAC addresses & Client IDs
            if (lowerKey.includes('mac') || lowerKey.includes('clientid') || /^([0-9a-fA-F]{2}[:-]){5}([0-9a-fA-F]{2})$/.test(val) || /^1:([0-9a-fA-F]{1,2}:){5}[0-9a-fA-F]{1,2}$/.test(val)) {
                sanitized[key] = maskSensitiveText(val, 4, 2);
                continue;
            }

            // 6. Router Serial Numbers & Firmware Platform
            if (lowerKey.includes('serial')) {
                sanitized[key] = maskSensitiveText(val, 4, 3);
                continue;
            }
            if (lowerKey === 'version') {
                const major = val.split('.')[0] || '7';
                sanitized[key] = `${major}.x`;
                continue;
            }
            if (lowerKey === 'platform' || lowerKey === 'architecture') {
                sanitized[key] = 'Generic';
                continue;
            }

            // 7. Hostnames & Device names
            if (lowerKey.includes('hostname')) {
                sanitized[key] = maskSensitiveText(val, 3, 2);
                continue;
            }

            // 8. Queue Names with NIPs
            if (lowerKey === 'name' && val.startsWith('hotspot-') && val.length > 12) {
                const nipPart = val.replace('hotspot-', '');
                sanitized[key] = `hotspot-${maskSensitiveText(nipPart, 4, 3)}`;
                continue;
            }

            // 9. IP Addresses (Standalone or Embedded in text like location)
            if (/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/.test(val)) {
                sanitized[key] = val.replace(/\b(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\b/g, '$1.$2.***.$4');
                continue;
            }

            sanitized[key] = val;
        } else if (typeof val === 'object' && val !== null) {
            sanitized[key] = sanitizeVisitorData(val);
        } else {
            sanitized[key] = val;
        }
    }
    return sanitized;
};

module.exports = adminAuth;
module.exports.adminAuth = adminAuth;
module.exports.requireSuperAdmin = requireSuperAdmin;
module.exports.preventVisitorMutation = preventVisitorMutation;
module.exports.maskSensitiveText = maskSensitiveText;
module.exports.sanitizeVisitorData = sanitizeVisitorData;
