const bcrypt = require('bcrypt');
const { query } = require('../config/db');

const NOCR_GATEWAY_URL = process.env.NOCR_GATEWAY_URL || 'https://nocrnetwork.com/api/gateway/internal';
const NOCR_JWT_SECRET  = process.env.NOCR_JWT_SECRET || '1f108367b30b935a7270dc1f9e90d067efd5094e45f496664714ca2f76b1292b';

/**
 * Helper: Sinkronisasi user ke NOCR Auth Gateway (Two-Way Sync)
 */
async function syncToNocrGateway({ username, password, display_name, role, is_active }) {
    try {
        const payload = {
            username,
            password,
            display_name,
            role,
            tenant_slug: 'diskominfo',
            is_active: is_active !== false
        };

        const res = await fetch(`${NOCR_GATEWAY_URL}/sync-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-gateway-key': NOCR_JWT_SECRET,
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            console.warn('[SyncNOCR] Warning saat sinkronisasi:', data?.message || res.statusText);
        } else {
            console.log(`[SyncNOCR] Sukses: User @${username} tersinkronisasi ke NOCR Centralized Gateway.`);
        }
        return data;
    } catch (err) {
        console.error('[SyncNOCR] Error sinkronisasi ke NOCR Gateway:', err.message);
        // Tetap lanjut agar tidak mengganggu transaksi lokal jika jaringan gateway timeout
        return null;
    }
}

/**
 * Helper: Hapus akses tenant user dari NOCR Gateway
 */
async function deleteFromNocrGateway(username) {
    try {
        const res = await fetch(`${NOCR_GATEWAY_URL}/delete-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-gateway-key': NOCR_JWT_SECRET,
            },
            body: JSON.stringify({ username, tenant_slug: 'diskominfo' })
        });
        const data = await res.json();
        console.log(`[SyncNOCR] User @${username} dihapus dari hak akses NOCR Gateway.`);
        return data;
    } catch (err) {
        console.error('[SyncNOCR] Error menghapus user di NOCR Gateway:', err.message);
        return null;
    }
}

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

    if (password.length < 8) {
        return res.status(400).json({ success: false, message: 'Password minimal 8 karakter.' });
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

        const newAdmin = result.rows[0];

        // Two-Way Sync: Otomatis sinkronkan user ke NOCR Gateway
        await syncToNocrGateway({
            username: cleanUsername,
            password: password,
            display_name: full_name || cleanUsername,
            role: assignedRole,
            is_active: is_active
        });

        res.status(201).json({
            success: true,
            message: 'Pengelola berhasil ditambahkan dan disinkronkan ke NOCR Gateway.',
            data: newAdmin
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

        let hasNewPassword = false;
        if (password && password.trim().length > 0) {
            if (password.length < 8) {
                return res.status(400).json({ success: false, message: 'Password minimal 8 karakter.' });
            }
            const password_hash = await bcrypt.hash(password, 12);
            queryText += `, password_hash = $6 WHERE id = $5 RETURNING id, username, full_name, email, role, is_active, updated_at`;
            params.push(password_hash);
            hasNewPassword = true;
        } else {
            queryText += ` WHERE id = $5 RETURNING id, username, full_name, email, role, is_active, updated_at`;
        }

        const result = await query(queryText, params);
        const updatedAdmin = result.rows[0];

        // Two-Way Sync: Update data / password di NOCR Gateway
        await syncToNocrGateway({
            username: targetAdmin.username,
            password: hasNewPassword ? password : null,
            display_name: full_name !== undefined ? full_name : targetAdmin.full_name,
            role: assignedRole,
            is_active: updatedIsActive
        });

        res.json({
            success: true,
            message: 'Data admin pengelola berhasil diperbarui dan disinkronkan ke NOCR Gateway.',
            data: updatedAdmin
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

        // Two-Way Sync: Hapus hak akses tenant user dari NOCR Gateway
        await deleteFromNocrGateway(targetAdmin.username);

        res.json({
            success: true,
            message: `Admin pengelola @${targetAdmin.username} berhasil dihapus dari SIPAS dan NOCR Gateway.`
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
