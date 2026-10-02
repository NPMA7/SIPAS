const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const { query } = require('../config/db');

const DUMMY_HASH = '$2b$12$X5eO8qW0V3n3p7y5z8R2XeXy2w9v8u7t6s5r4q3p2o1n0m9l8k7j6';
const NOCR_JWT_SECRET = process.env.NOCR_JWT_SECRET || '1f108367b30b935a7270dc1f9e90d067efd5094e45f496664714ca2f76b1292b';

/**
 * GET /api/admin/gateway-sso
 * Seamless SSO from NOCR Centralized Gateway
 */
const gatewaySso = async (req, res) => {
    try {
        let nocrToken = null;
        if (req.headers.cookie) {
            const match = req.headers.cookie.match(/(?:^|;\s*)nocr_token=([^;]+)/);
            if (match) nocrToken = decodeURIComponent(match[1]);
        }
        if (!nocrToken && req.headers['authorization']) {
            const parts = req.headers['authorization'].split(' ');
            if (parts.length === 2 && parts[0] === 'Bearer') nocrToken = parts[1];
        }

        if (!nocrToken) {
            return res.status(401).json({ success: false, message: 'Tidak ada sesi NOCR Gateway.' });
        }

        let decoded;
        try {
            decoded = jwt.verify(nocrToken, NOCR_JWT_SECRET);
        } catch (e) {
            return res.status(401).json({ success: false, message: 'Sesi NOCR tidak valid atau kedaluwarsa.' });
        }

        const username = (decoded.username || 'admin').toLowerCase().trim();
        let result = await query(
            'SELECT * FROM admin_users WHERE LOWER(username) = $1 AND is_active = TRUE',
            [username]
        );

        let admin = result.rows[0];

        // If not found in admin_users, auto register / map:
        if (!admin) {
            const isSuper = decoded.role === 'superadmin';
            const role = isSuper ? 'superadmin' : (decoded.role === 'admin' ? 'admin' : 'visitor');
            const insertRes = await query(
                `INSERT INTO admin_users (username, password_hash, full_name, email, role, is_active)
                 VALUES ($1, $2, $3, $4, $5, TRUE)
                 ON CONFLICT (username) DO UPDATE SET role = EXCLUDED.role, is_active = TRUE
                 RETURNING *`,
                [username, DUMMY_HASH, decoded.display_name || username, `${username}@nocrnetwork.com`, role]
            );
            admin = insertRes.rows[0];
        }

        const token = jwt.sign(
            { id: admin.id, username: admin.username, full_name: admin.full_name, role: admin.role || 'admin' },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        return res.json({
            success: true,
            message: 'SSO NOCR Gateway berhasil.',
            token,
            admin: {
                id: admin.id,
                username: admin.username,
                full_name: admin.full_name || admin.username,
                email: admin.email,
                role: admin.role || 'admin',
            }
        });
    } catch (err) {
        console.error('[AdminController] gatewaySso error:', err.message);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

/**
 * POST /api/admin/login
 * Login admin dan dapatkan JWT token
 */
const login = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username dan password wajib diisi.' });
    }

    try {
        const result = await query(
            'SELECT * FROM admin_users WHERE username = $1 AND is_active = TRUE',
            [username.toLowerCase().trim()]
        );

        if (result.rows.length === 0) {
            await bcrypt.compare(password, DUMMY_HASH);
            return res.status(401).json({ success: false, message: 'Username atau password salah.' });
        }

        const admin = result.rows[0];
        const isValid = await bcrypt.compare(password, admin.password_hash);

        if (!isValid) {
            return res.status(401).json({ success: false, message: 'Username atau password salah.' });
        }

        const token = jwt.sign(
            { id: admin.id, username: admin.username, full_name: admin.full_name, role: admin.role || 'admin' },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        return res.json({
            success: true,
            message: 'Login berhasil.',
            token,
            admin: {
                id: admin.id,
                username: admin.username,
                full_name: admin.full_name,
                email: admin.email,
                role: admin.role || 'admin',
            }
        });
    } catch (err) {
        console.error('[AdminController] login error:', err.message);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

/**
 * GET /api/admin/profile
 */
const getProfile = async (req, res) => {
    try {
        const result = await query(
            'SELECT id, username, full_name, email, role, created_at FROM admin_users WHERE id = $1',
            [req.admin.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Admin tidak ditemukan.' });
        }
        return res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

/**
 * PUT /api/admin/change-password
 */
const changePassword = async (req, res) => {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
        return res.status(400).json({ success: false, message: 'Password lama dan baru wajib diisi.' });
    }
    if (new_password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password baru minimal 6 karakter.' });
    }
    try {
        const result = await query('SELECT * FROM admin_users WHERE id = $1', [req.admin.id]);
        const admin = result.rows[0];
        const isValid = await bcrypt.compare(current_password, admin.password_hash);
        if (!isValid) {
            return res.status(400).json({ success: false, message: 'Password lama tidak sesuai.' });
        }
        const hash = await bcrypt.hash(new_password, 12);
        await query('UPDATE admin_users SET password_hash = $1 WHERE id = $2', [hash, req.admin.id]);
        return res.json({ success: true, message: 'Password berhasil diubah.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

module.exports = { login, getProfile, changePassword, gatewaySso };
