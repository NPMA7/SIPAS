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
 * Sanitizes IP addresses, MAC addresses, serial numbers, hardware models, versions, and hostnames recursively
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

        if (typeof val === 'string' && val.trim() !== '') {
            // 1. MAC addresses & Client IDs
            if (lowerKey.includes('mac') || lowerKey.includes('clientid') || /^([0-9a-fA-F]{2}[:-]){5}([0-9a-fA-F]{2})$/.test(val) || /^1:([0-9a-fA-F]{1,2}:){5}[0-9a-fA-F]{1,2}$/.test(val)) {
                sanitized[key] = maskSensitiveText(val, 4, 2);
                continue;
            }

            // 2. IP Addresses (address, ip_address, to_address, router_ip, etc.)
            if (lowerKey.includes('ip') || lowerKey.includes('address') || /^(\d{1,3}\.){3}\d{1,3}(\/\d+)?$/.test(val)) {
                // Jangan mask jika boolean atau empty
                if (val.includes('.')) {
                    const parts = val.split('/');
                    const ip = parts[0];
                    const octets = ip.split('.');
                    if (octets.length === 4) {
                        const maskedIp = `${octets[0]}.${octets[1]}.***.${octets[3]}`;
                        sanitized[key] = parts.length > 1 ? `${maskedIp}/${parts[1]}` : maskedIp;
                        continue;
                    }
                }
                sanitized[key] = maskSensitiveText(val, 4, 2);
                continue;
            }

            // 3. Router Serial Numbers & Platform Architecture
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

            // 4. Hostnames & Device names
            if (lowerKey.includes('hostname') || lowerKey === 'host_name' || lowerKey === 'host-name') {
                sanitized[key] = maskSensitiveText(val, 3, 2);
                continue;
            }

            // 5. Password fields
            if (lowerKey.includes('password')) {
                sanitized[key] = '••••••••';
                continue;
            }

            // 6. Usernames / NIPs
            if (lowerKey === 'nip' || (lowerKey === 'name' && /^\d{10,}$/.test(val)) || (lowerKey === 'user' && /^\d{10,}$/.test(val))) {
                sanitized[key] = maskSensitiveText(val, 4, 3);
                continue;
            }

            // 7. Queue Names with NIPs
            if (lowerKey === 'name' && val.startsWith('hotspot-') && val.length > 12) {
                const nipPart = val.replace('hotspot-', '');
                sanitized[key] = `hotspot-${maskSensitiveText(nipPart, 4, 3)}`;
                continue;
            }

            // 8. Target Queue IP
            if (lowerKey === 'target' && val.includes('.')) {
                const parts = val.split('/');
                const ip = parts[0];
                const octets = ip.split('.');
                if (octets.length === 4) {
                    const maskedIp = `${octets[0]}.${octets[1]}.***.${octets[3]}`;
                    sanitized[key] = parts.length > 1 ? `${maskedIp}/${parts[1]}` : maskedIp;
                    continue;
                }
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
