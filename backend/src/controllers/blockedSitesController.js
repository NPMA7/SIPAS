const { query } = require('../config/db');
const { syncUserToActiveRouters } = require('./userController');
const mikrotik = require('../services/mikrotikService');

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

// Helper untuk memperbarui daftar user yang diblokir untuk suatu site key
const syncUsersForBlockedSite = async (siteKey, targetUserIds) => {
    if (!Array.isArray(targetUserIds)) return;

    const targetSet = new Set(targetUserIds.map(id => parseInt(id)));
    const cleanSiteKey = siteKey.toLowerCase().trim();

    const usersRes = await query(`SELECT * FROM hotspot_users WHERE is_active = TRUE`);
    let activeRouters = [];
    try {
        const activeRoutersRes = await query(`SELECT * FROM routers WHERE is_active = TRUE`);
        activeRouters = activeRoutersRes.rows;
    } catch (_) {}

    for (const u of usersRes.rows) {
        let blocks = (u.website_block || '')
            .split(',')
            .map(s => s.trim().toLowerCase())
            .filter(Boolean);

        const shouldHave = targetSet.has(u.id);
        const hasBlock = blocks.includes(cleanSiteKey);

        let modified = false;
        if (shouldHave && !hasBlock) {
            blocks.push(cleanSiteKey);
            modified = true;
        } else if (!shouldHave && hasBlock) {
            blocks = blocks.filter(b => b !== cleanSiteKey);
            modified = true;
        }

        if (modified) {
            const newBlockStr = blocks.join(',');
            await query(`UPDATE hotspot_users SET website_block = $1, updated_at = NOW() WHERE id = $2`, [newBlockStr, u.id]);
            u.website_block = newBlockStr;
        }

        // Jalankan sinkronisasi jaringan MikroTik di background
        if (shouldHave || modified) {
            (async () => {
                if (!shouldHave) {
                    for (const r of activeRouters) {
                        try {
                            await mikrotik.removeUserBlockFromMikrotik(r, cleanSiteKey, u.username);
                        } catch (_) {}
                    }
                } else {
                    try {
                        await syncUserToActiveRouters(u);
                    } catch (_) {}
                }
            })();
        }
    }
};

// ─── GET /api/blocked-sites ──────────────────────────────────────────────────
const getBlockedSites = async (req, res) => {
    try {
        await ensureTableExists();
        const sitesResult = await query(`SELECT * FROM blocked_sites ORDER BY id ASC`);
        const usersResult = await query(`SELECT id, username, full_name, website_block FROM hotspot_users WHERE is_active = TRUE ORDER BY id ASC`);

        const sites = sitesResult.rows.map(site => {
            const blockedUserIds = [];
            const blockedUsernames = [];
            usersResult.rows.forEach(u => {
                const userBlocks = (u.website_block || '').split(',').map(s => s.trim().toLowerCase());
                if (userBlocks.includes(site.key.toLowerCase())) {
                    blockedUserIds.push(u.id);
                    blockedUsernames.push(u.full_name || u.username);
                }
            });
            return {
                ...site,
                blocked_user_ids: blockedUserIds,
                blocked_usernames: blockedUsernames,
            };
        });

        res.json({
            success: true,
            data: sites,
            users: usersResult.rows.map(u => ({ id: u.id, username: u.username, full_name: u.full_name }))
        });
    } catch (err) {
        console.error('[BlockedSitesController] getBlockedSites:', err.message);
        res.status(500).json({ success: false, message: 'Gagal mengambil daftar situs terblokir.' });
    }
};

// ─── POST /api/blocked-sites ─────────────────────────────────────────────────
const createBlockedSite = async (req, res) => {
    const { key, name, domains, l7_regex, user_ids } = req.body;
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

        const newSite = result.rows[0];

        if (Array.isArray(user_ids)) {
            await syncUsersForBlockedSite(cleanKey, user_ids);
        }

        res.json({ success: true, data: newSite, message: 'Situs terblokir berhasil ditambahkan.' });
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
    const { name, domains, l7_regex, is_active, user_ids } = req.body;
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

        const site = result.rows[0];

        if (Array.isArray(user_ids)) {
            await syncUsersForBlockedSite(site.key, user_ids);
        }

        res.json({ success: true, data: site, message: 'Situs terblokir berhasil diperbarui.' });
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
        const site = result.rows[0];
        // Hapus site.key dari semua user dan bersihkan rules MikroTik
        await syncUsersForBlockedSite(site.key, []);
        try {
            const activeRouters = await query(`SELECT * FROM routers WHERE is_active = TRUE`);
            for (const r of activeRouters.rows) {
                mikrotik.purgeBlockedSiteFromMikrotik(r, site.key).catch(() => {});
            }
        } catch (_) {}

        res.json({ success: true, message: `Situs "${site.name}" berhasil dihapus.` });
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
