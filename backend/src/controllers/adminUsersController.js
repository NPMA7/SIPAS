const bcrypt = require('bcrypt');
const { query } = require('../config/db');

/**
 * GET /api/admin-users
 * Mengambil daftar seluruh admin pengelola
 */
const getAllAdminUsers = async (req, res) => {
    try {
        const isSuper = req.admin && req.admin.role === 'superadmin';
        const queryText = isSuper
            ? `SELECT id, username, full_name, email, role, is_active, created_at, updated_at
               FROM admin_users
               ORDER BY CASE WHEN role = 'superadmin' THEN 1 WHEN role = 'operator' THEN 2 ELSE 3 END, id ASC`
            : `SELECT id, username, full_name, email, role, is_active, created_at, updated_at
               FROM admin_users
               WHERE role != 'superadmin'
               ORDER BY CASE WHEN role = 'operator' THEN 1 ELSE 2 END, id ASC`;

        const result = await query(queryText);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('[AdminUsersController] getAllAdminUsers error:', err.message);
        res.status(500).json({ success: false, message: 'Gagal mengambil data admin pengelola.' });
    }
};

/**
 * POST /api/admin-users
 * Membuat admin pengelola baru (Khusus Superadmin)
 */
const createAdminUser = async (req, res) => {
    const { username, password, full_name, email, role = 'operator', is_active = true } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username dan password wajib diisi.' });
    }

    if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password minimal 6 karakter.' });
    }

    const validRoles = ['superadmin', 'operator', 'visitor'];
    const assignedRole = validRoles.includes(role.toLowerCase()) ? role.toLowerCase() : 'operator';

    try {
        const cleanUsername = username.toLowerCase().trim();
        const existing = await query('SELECT id FROM admin_users WHERE username = $1', [cleanUsername]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'Username sudah digunakan.' });
        }

        const password_hash = await bcrypt.hash(password, 12);
        const result = await query(`
            INSERT INTO admin_users (username, password_hash, full_name, email, role, is_active)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, username, full_name, email, role, is_active, created_at
        `, [cleanUsername, password_hash, full_name || null, email || null, assignedRole, is_active]);

        res.status(201).json({
            success: true,
            message: 'Pengelola berhasil ditambahkan.',
            data: result.rows[0]
        });
    } catch (err) {
        console.error('[AdminUsersController] createAdminUser error:', err.message);
        res.status(500).json({ success: false, message: err.message || 'Gagal menambahkan pengelola.' });
    }
};

/**
 * PUT /api/admin-users/:id
 * Mengubah data pengelola, role, status aktif, atau reset password (Khusus Superadmin)
 */
const updateAdminUser = async (req, res) => {
    const { id } = req.params;
    const { full_name, email, role, is_active, password } = req.body;

    try {
        const existing = await query('SELECT * FROM admin_users WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Pengelola tidak ditemukan.' });
        }

        const targetAdmin = existing.rows[0];

        // Proteksi: Tidak bisa menonaktifkan atau mendowngrade superadmin terakhir
        if (targetAdmin.role === 'superadmin' && (role && role !== 'superadmin' || is_active === false)) {
            const superCount = await query("SELECT COUNT(*) FROM admin_users WHERE role = 'superadmin' AND is_active = true");
            if (parseInt(superCount.rows[0].count, 10) <= 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Tidak dapat menonaktifkan atau mengubah role Superadmin terakhir.'
                });
            }
        }

        const validRoles = ['superadmin', 'operator', 'visitor'];
        const assignedRole = role && validRoles.includes(role.toLowerCase()) ? role.toLowerCase() : targetAdmin.role;
        const updatedIsActive = is_active !== undefined ? Boolean(is_active) : targetAdmin.is_active;

        let queryText = `
            UPDATE admin_users
            SET full_name = $1, email = $2, role = $3, is_active = $4, updated_at = NOW()
        `;
        const params = [
            full_name !== undefined ? full_name : targetAdmin.full_name,
            email !== undefined ? email : targetAdmin.email,
            assignedRole,
            updatedIsActive,
            id
        ];

        if (password && password.trim().length > 0) {
            if (password.length < 6) {
                return res.status(400).json({ success: false, message: 'Password minimal 6 karakter.' });
            }
            const password_hash = await bcrypt.hash(password, 12);
            queryText += `, password_hash = $6 WHERE id = $5 RETURNING id, username, full_name, email, role, is_active, updated_at`;
            params.push(password_hash);
        } else {
            queryText += ` WHERE id = $5 RETURNING id, username, full_name, email, role, is_active, updated_at`;
        }

        const result = await query(queryText, params);

        res.json({
            success: true,
            message: 'Data admin pengelola berhasil diperbarui.',
            data: result.rows[0]
        });
    } catch (err) {
        console.error('[AdminUsersController] updateAdminUser error:', err.message);
        res.status(500).json({ success: false, message: err.message || 'Gagal memperbarui admin.' });
    }
};

/**
 * DELETE /api/admin-users/:id
 * Menghapus admin pengelola
 */
const deleteAdminUser = async (req, res) => {
    const { id } = req.params;

    try {
        const existing = await query('SELECT * FROM admin_users WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Admin tidak ditemukan.' });
        }

        const targetAdmin = existing.rows[0];

        // Proteksi: Tidak bisa menghapus diri sendiri
        if (parseInt(id, 10) === req.admin.id) {
            return res.status(400).json({
                success: false,
                message: 'Anda tidak dapat menghapus akun Anda sendiri yang sedang digunakan login.'
            });
        }

        // Proteksi: Tidak bisa menghapus akun dengan role Superadmin melalui web
        if (targetAdmin.role === 'superadmin') {
            return res.status(400).json({
                success: false,
                message: 'Akun dengan role Superadmin tidak dapat dihapus.'
            });
        }

        await query('DELETE FROM admin_users WHERE id = $1', [id]);

        res.json({
            success: true,
            message: `Admin pengelola @${targetAdmin.username} berhasil dihapus.`
        });
    } catch (err) {
        console.error('[AdminUsersController] deleteAdminUser error:', err.message);
        res.status(500).json({ success: false, message: err.message || 'Gagal menghapus admin.' });
    }
};

module.exports = {
    getAllAdminUsers,
    createAdminUser,
    updateAdminUser,
    deleteAdminUser,
};
