const { query } = require('../config/db');

// Ensure table blocked_sites exists on start
const ensureTableExists = async () => {
    try {
        await query(`
            CREATE TABLE IF NOT EXISTS blocked_sites (
                id SERIAL PRIMARY KEY,
                key VARCHAR(50) UNIQUE NOT NULL,
                name VARCHAR(100) NOT NULL,
                domains TEXT NOT NULL,
                l7_regex TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        // Seed initial default sites if table is empty
        const countRes = await query(`SELECT COUNT(*) FROM blocked_sites`);
        if (parseInt(countRes.rows[0].count) === 0) {
            await query(`
                INSERT INTO blocked_sites (key, name, domains, l7_regex) VALUES
                ('npma', 'NPMA Website', 'npma.my.id, www.npma.my.id', '^.*(npma.my.id).*$'),
                ('youtube', 'YouTube & CDN', 'youtube.com, googlevideo.com, ytimg.com', '^.*(youtube|googlevideo).*$')
                ON CONFLICT (key) DO NOTHING;
            `);
        }
    } catch (err) {
        console.error('[BlockedSitesController] ensureTableExists:', err.message);
    }
};

ensureTableExists();

// ─── GET /api/blocked-sites ──────────────────────────────────────────────────
const getBlockedSites = async (req, res) => {
    try {
        await ensureTableExists();
        const result = await query(`SELECT * FROM blocked_sites ORDER BY id ASC`);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('[BlockedSitesController] getBlockedSites:', err.message);
        res.status(500).json({ success: false, message: 'Gagal mengambil daftar situs terblokir.' });
    }
};

// ─── POST /api/blocked-sites ─────────────────────────────────────────────────
const createBlockedSite = async (req, res) => {
    const { key, name, domains, l7_regex } = req.body;
    if (!key || !name || !domains) {
        return res.status(400).json({ success: false, message: 'Key, Nama, dan Domain wajib diisi.' });
    }

    const cleanKey = key.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!cleanKey) {
        return res.status(400).json({ success: false, message: 'Key tidak valid (gunakan huruf, angka, minus/underscore).' });
    }

    try {
        const result = await query(
            `INSERT INTO blocked_sites (key, name, domains, l7_regex)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [cleanKey, name.trim(), domains.trim(), l7_regex ? l7_regex.trim() : null]
        );
        res.json({ success: true, data: result.rows[0], message: 'Situs terblokir berhasil ditambahkan.' });
    } catch (err) {
        console.error('[BlockedSitesController] createBlockedSite:', err.message);
        if (err.code === '23505') {
            return res.status(400).json({ success: false, message: `Key "${cleanKey}" sudah digunakan.` });
        }
        res.status(500).json({ success: false, message: 'Gagal menambah situs terblokir.' });
    }
};

// ─── PUT /api/blocked-sites/:id ──────────────────────────────────────────────
const updateBlockedSite = async (req, res) => {
    const { name, domains, l7_regex, is_active } = req.body;
    const { id } = req.params;

    try {
        const result = await query(
            `UPDATE blocked_sites
             SET name = COALESCE($1, name),
                 domains = COALESCE($2, domains),
                 l7_regex = COALESCE($3, l7_regex),
                 is_active = COALESCE($4, is_active),
                 updated_at = NOW()
             WHERE id = $5
             RETURNING *`,
            [name?.trim(), domains?.trim(), l7_regex !== undefined ? l7_regex?.trim() : null, is_active, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Situs terblokir tidak ditemukan.' });
        }
        res.json({ success: true, data: result.rows[0], message: 'Situs terblokir berhasil diperbarui.' });
    } catch (err) {
        console.error('[BlockedSitesController] updateBlockedSite:', err.message);
        res.status(500).json({ success: false, message: 'Gagal memperbarui situs terblokir.' });
    }
};

// ─── DELETE /api/blocked-sites/:id ───────────────────────────────────────────
const deleteBlockedSite = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await query(`DELETE FROM blocked_sites WHERE id = $1 RETURNING *`, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Situs terblokir tidak ditemukan.' });
        }
        res.json({ success: true, message: `Situs "${result.rows[0].name}" berhasil dihapus.` });
    } catch (err) {
        console.error('[BlockedSitesController] deleteBlockedSite:', err.message);
        res.status(500).json({ success: false, message: 'Gagal menghapus situs terblokir.' });
    }
};

module.exports = {
    getBlockedSites,
    createBlockedSite,
    updateBlockedSite,
    deleteBlockedSite,
};
