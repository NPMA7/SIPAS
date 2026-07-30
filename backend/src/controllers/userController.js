const { query }   = require('../config/db');
const multer      = require('multer');
const { parseCSVUsers } = require('../utils/csvImport');
const mikrotik    = require('../services/mikrotikService');

// Multer: simpan file di memory
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Hanya file CSV yang diperbolehkan.'));
        }
    }
});

// ─── GET /api/users ──────────────────────────────────────────────────────────
const getUsers = async (req, res) => {
    const { page = 1, limit = 50, search = '', router_id, is_active, auth_provider } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let conditions = [];
    let params = [];
    let pi = 1;

    if (search) {
        conditions.push(`(hu.username ILIKE $${pi} OR hu.full_name ILIKE $${pi} OR hu.nip ILIKE $${pi} OR hu.jabatan ILIKE $${pi} OR hu.instansi ILIKE $${pi} OR hu.email ILIKE $${pi})`);
        params.push(`%${search}%`);
        pi++;
    }
    if (router_id) {
        conditions.push(`hu.router_id = $${pi}`);
        params.push(parseInt(router_id));
        pi++;
    }
    if (is_active !== undefined) {
        conditions.push(`hu.is_active = $${pi}`);
        params.push(is_active === 'true');
        pi++;
    }
    if (auth_provider) {
        conditions.push(`hu.auth_provider = $${pi}`);
        params.push(auth_provider);
        pi++;
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    try {
        const countResult = await query(
            `SELECT COUNT(*) FROM hotspot_users hu ${where}`,
            params
        );
        const total = parseInt(countResult.rows[0].count);

        const result = await query(
            `SELECT hu.id, hu.username, hu.password, hu.full_name, hu.email, hu.phone,
                    hu.bandwidth_limit, hu.max_devices, hu.website_block, hu.is_active, hu.auth_provider, hu.nip,
                    hu.jabatan, hu.instansi,
                    hu.router_id, r.name as router_name, r.ip_address as router_ip,
                    hu.notes, hu.created_at, hu.updated_at
             FROM hotspot_users hu
             LEFT JOIN routers r ON hu.router_id = r.id
             ${where}
             ORDER BY hu.created_at DESC
             LIMIT $${pi} OFFSET $${pi + 1}`,
            [...params, parseInt(limit), offset]
        );


        res.json({
            success: true,
            data:  result.rows,
            pagination: {
                total,
                page:  parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (err) {
        console.error('[UserController] getUsers:', err.message);
        res.status(500).json({ success: false, message: 'Gagal mengambil data user.' });
    }
};

// ─── GET /api/users/:id ──────────────────────────────────────────────────────
const getUserById = async (req, res) => {
    try {
        const result = await query(
            `SELECT hu.*, r.name as router_name, r.ip_address as router_ip
             FROM hotspot_users hu
             LEFT JOIN routers r ON hu.router_id = r.id
             WHERE hu.id = $1`,
            [req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Gagal mengambil data user.' });
    }
};

// ─── POST /api/users ─────────────────────────────────────────────────────────
const createUser = async (req, res) => {
    const { username, password, full_name, email, phone, bandwidth_limit, max_devices, website_block, router_id, notes, auth_provider, nip, jabatan, instansi } = req.body;

    const provider = auth_provider === 'sso' ? 'sso' : 'local';
    const userPass = provider === 'sso' ? '[SSO_AUTH]' : password;

    if (!username || (!userPass && provider === 'local')) {
        return res.status(400).json({ success: false, message: 'Username dan password wajib diisi.' });
    }

    const bwRegex = /^\d+[KMG]\/\d+[KMG]$/i;
    const bw = bandwidth_limit || '10M/10M';
    if (!bwRegex.test(bw)) {
        return res.status(400).json({ success: false, message: 'Format bandwidth tidak valid. Contoh: 10M/10M' });
    }

    const maxDev = max_devices ? Math.max(1, parseInt(max_devices)) : 4;

    try {
        const result = await query(
            `INSERT INTO hotspot_users
             (username, password, full_name, email, phone, bandwidth_limit, max_devices, website_block, router_id, notes, auth_provider, nip, jabatan, instansi)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
             RETURNING *`,
            [
                username.toLowerCase().trim(), userPass, full_name || null,
                email || null, phone || null, bw.toUpperCase(), maxDev,
                website_block || '', router_id || null, notes || null,
                provider, nip || username.toLowerCase().trim(),
                jabatan || '', instansi || ''
            ]
        );
        res.status(201).json({ success: true, message: 'User berhasil ditambahkan.', data: result.rows[0] });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ success: false, message: 'Username sudah digunakan.' });
        }
        console.error('[UserController] createUser:', err.message);
        res.status(500).json({ success: false, message: 'Gagal menambahkan user.' });
    }
};

// Helper function untuk sync realtime ke router secara asinkron (background)
const syncUserToActiveRouters = async (user) => {
    try {
        let routersToSync = [];
        if (user.router_id) {
            const rResult = await query('SELECT * FROM routers WHERE id = $1', [user.router_id]);
            routersToSync = rResult.rows;
        } else {
            const rResult = await query('SELECT * FROM routers WHERE is_active = TRUE');
            routersToSync = rResult.rows;
        }

        for (const routerConfig of routersToSync) {
            try {
                const sessions = await mikrotik.getActiveHotspotUsers(routerConfig);
                const userSession = sessions.find(s => s.user && s.user.toLowerCase() === user.username.toLowerCase());
                if (userSession) {
                    await mikrotik.setupPortalUser(
                        routerConfig,
                        user.username,
                        user.password,
                        userSession.address,
                        userSession.mac,
                        user.bandwidth_limit,
                        user.website_block
                    );
                }
            } catch (rErr) {
                console.warn(`[UserController] Realtime sync warning for router ${routerConfig.name || routerConfig.id}:`, rErr.message);
            }
        }
    } catch (err) {
        console.warn('[UserController] syncUserToActiveRouters error:', err.message);
    }
};

// ─── PUT /api/users/:id ──────────────────────────────────────────────────────
const updateUser = async (req, res) => {
    const { full_name, email, phone, password, bandwidth_limit, max_devices, website_block, router_id, is_active, notes, jabatan, instansi, nip } = req.body;

    try {
        const existing = await query('SELECT * FROM hotspot_users WHERE id = $1', [req.params.id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
        }

        const user = existing.rows[0];
        const bw = bandwidth_limit || user.bandwidth_limit;
        const maxDev = max_devices !== undefined ? Math.max(1, parseInt(max_devices)) : (user.max_devices || 4);

        // Normalisasi router_id. Jika kosong atau null, simpan sebagai null (untuk Semua Router)
        let rId = user.router_id;
        if (router_id !== undefined) {
            rId = (router_id === '' || router_id === null) ? null : parseInt(router_id);
        }

        const result = await query(
            `UPDATE hotspot_users SET
                full_name       = COALESCE($1, full_name),
                email           = COALESCE($2, email),
                phone           = COALESCE($3, phone),
                password        = COALESCE($4, password),
                bandwidth_limit = $5,
                website_block   = COALESCE($6, website_block),
                router_id       = $7,
                is_active       = COALESCE($8, is_active),
                notes           = COALESCE($9, notes),
                jabatan         = COALESCE($10, jabatan),
                instansi        = COALESCE($11, instansi),
                nip             = COALESCE($12, nip),
                max_devices     = $13
             WHERE id = $14
             RETURNING *`,
            [full_name, email, phone, password, bw, website_block, rId, is_active, notes, jabatan, instansi, nip, maxDev, req.params.id]
        );


        const updatedUser = result.rows[0];

        // Sinkronisasi status blokir dan bandwidth ke Mikrotik secara realtime di background (non-blocking untuk UI)
        syncUserToActiveRouters(updatedUser).catch(err => {
            console.warn('[UserController] Background sync error during update:', err.message);
        });

        res.json({ success: true, message: 'User berhasil diupdate.', data: updatedUser });
    } catch (err) {
        console.error('[UserController] updateUser:', err.message);
        res.status(500).json({ success: false, message: 'Gagal mengupdate user.' });
    }
};

// ─── DELETE /api/users/:id ───────────────────────────────────────────────────
const deleteUser = async (req, res) => {
    try {
        // Ambil data user beserta router sebelum dihapus
        const userRes = await query(
            `SELECT hu.*, r.ip_address, r.api_port, r.api_username, r.api_password
             FROM hotspot_users hu
             LEFT JOIN routers r ON hu.router_id = r.id
             WHERE hu.id = $1`,
            [req.params.id]
        );
        if (userRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
        }
        const user = userRes.rows[0];

        // Hapus di Mikrotik jika user memiliki router terkait
        if (user.ip_address) {
            const routerConfig = {
                ip_address:   user.ip_address,
                api_port:     user.api_port,
                api_username: user.api_username,
                api_password: user.api_password,
            };
            try {
                // 1. Kick semua sesi aktif dengan username ini di Mikrotik
                const actives = await mikrotik.getActiveHotspotUsers(routerConfig);
                for (const session of actives) {
                    if ((session.user || '').toLowerCase() === user.username.toLowerCase()) {
                        await mikrotik.removeHotspotActive(routerConfig, session.id);
                    }
                }

                // 2. Hapus hotspot user lokal dari router (cari by name dulu)
                try {
                    await mikrotik.removeRouterHotspotUserByName(routerConfig, user.username);
                } catch (_) {}

                // 3. Hapus Simple Queue bandwidth
                try {
                    await mikrotik.removeSimpleQueue(routerConfig, user.username);
                } catch (_) {}
            } catch (mkErr) {
                console.warn('[UserController] Mikrotik cleanup on delete warning:', mkErr.message);
            }
        }

        // Tandai sesi DB sebagai logout
        await query(
            `UPDATE active_sessions SET logout_at = NOW() WHERE hotspot_user_id = $1 AND logout_at IS NULL`,
            [user.id]
        );

        // Hapus dari database
        await query('DELETE FROM hotspot_users WHERE id = $1', [req.params.id]);

        res.json({ success: true, message: `User "${user.username}" berhasil dihapus beserta semua sesi aktifnya.` });
    } catch (err) {
        console.error('[UserController] deleteUser:', err.message);
        res.status(500).json({ success: false, message: 'Gagal menghapus user.' });
    }
};

// ─── PUT /api/users/:id/bandwidth ────────────────────────────────────────────
const updateBandwidth = async (req, res) => {
    const { bandwidth_limit } = req.body;

    const bwRegex = /^\d+[KMG]\/\d+[KMG]$/i;
    if (!bandwidth_limit || !bwRegex.test(bandwidth_limit)) {
        return res.status(400).json({ success: false, message: 'Format bandwidth tidak valid. Contoh: 10M/10M' });
    }

    try {
        // Update di database
        const result = await query(
            `UPDATE hotspot_users SET bandwidth_limit = $1 WHERE id = $2 RETURNING *, router_id`,
            [bandwidth_limit.toUpperCase(), req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
        }

        const user = result.rows[0];

        // Sync di background
        syncUserToActiveRouters(user).catch(err => {
            console.warn('[UserController] Background bandwidth sync error:', err.message);
        });

        res.json({
            success: true,
            message: 'Bandwidth berhasil diupdate.',
            data: { user }
        });
    } catch (err) {
        console.error('[UserController] updateBandwidth:', err.message);
        res.status(500).json({ success: false, message: 'Gagal mengupdate bandwidth.' });
    }
};

// ─── PUT /api/users/:id/block ────────────────────────────────────────────────
const toggleWebsiteBlock = async (req, res) => {
    const { website_block } = req.body; // string, e.g. 'npma,youtube' atau ''

    if (website_block === undefined) {
        return res.status(400).json({ success: false, message: 'website_block wajib diisi.' });
    }

    try {
        const result = await query(
            `UPDATE hotspot_users SET website_block = $1 WHERE id = $2 RETURNING *, router_id`,
            [website_block || '', req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
        }

        const user = result.rows[0];

        // Terapkan ke Mikrotik di background secara asinkron
        syncUserToActiveRouters(user).catch(err => {
            console.warn('[UserController] Background block sync error:', err.message);
        });

        res.json({
            success: true,
            message: `Blokir situs diubah ke: ${website_block || 'Tidak ada'}.`,
            data: user,
            note: 'Perubahan diterapkan otomatis ke router.',
        });
    } catch (err) {
        console.error('[UserController] toggleWebsiteBlock:', err.message);
        res.status(500).json({ success: false, message: 'Gagal mengubah status blokir.' });
    }
};

// ─── POST /api/users/import-csv ──────────────────────────────────────────────
const importCSV = [
    upload.single('csv_file'),
    async (req, res) => {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'File CSV tidak ditemukan.' });
        }

        try {
            const { users, errors } = parseCSVUsers(req.file.buffer);

            if (users.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Tidak ada data valid dalam CSV.',
                    errors
                });
            }

            let imported = 0;
            let skipped  = 0;
            const importErrors = [...errors];

            for (const u of users) {
                try {
                    await query(
                        `INSERT INTO hotspot_users (username, password, bandwidth_limit, website_block, router_id)
                         VALUES ($1, $2, $3, $4, $5)
                         ON CONFLICT (username) DO UPDATE SET
                             password        = EXCLUDED.password,
                             bandwidth_limit = EXCLUDED.bandwidth_limit,
                             website_block   = EXCLUDED.website_block,
                             router_id       = EXCLUDED.router_id`,
                        [u.username, u.password, u.bandwidth_limit, u.website_block, u.router_id]
                    );
                    imported++;
                } catch (rowErr) {
                    importErrors.push({ username: u.username, message: rowErr.message });
                    skipped++;
                }
            }

            res.json({
                success: true,
                message: `Import selesai: ${imported} berhasil, ${skipped} gagal.`,
                data: { imported, skipped, errors: importErrors }
            });
        } catch (err) {
            console.error('[UserController] importCSV:', err.message);
            res.status(500).json({ success: false, message: 'Gagal memproses file CSV.' });
        }
    }
];

module.exports = {
    getUsers, getUserById, createUser, updateUser, deleteUser,
    updateBandwidth, toggleWebsiteBlock, importCSV
};
