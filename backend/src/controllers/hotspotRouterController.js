const { query } = require('../config/db');
const mikrotik = require('../services/mikrotikService');

const parseRouterId = (raw) => {
    if (!raw) return { valid: false, message: 'router_id wajib diisi.' };
    const val = Array.isArray(raw) ? raw[0] : raw;
    const str = String(val).trim();
    if (!/^\d+$/.test(str)) {
        return { valid: false, message: 'router_id tidak valid.' };
    }
    const id = parseInt(str, 10);
    if (isNaN(id) || id <= 0) {
        return { valid: false, message: 'router_id tidak valid.' };
    }
    return { valid: true, id };
};

const getActiveSessions = async (req, res) => {
    const check = parseRouterId(req.query.router_id);
    if (!check.valid) {
        return res.status(400).json({ success: false, message: check.message });
    }

    try {
        const rResult = await query('SELECT * FROM routers WHERE id = $1', [check.id]);
        if (rResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Router tidak ditemukan.' });
        }

        const isVisitor = req.admin && req.admin.role === 'visitor';
        const { sanitizeVisitorData } = require('../middleware/adminAuth');

        const active = await mikrotik.getActiveHotspotUsers(rResult.rows[0]);
        let enriched = await Promise.all(active.map(async (s) => {
            const userResult = await query(
                'SELECT bandwidth_limit, website_block, full_name, nip, jabatan, instansi FROM hotspot_users WHERE username = $1 OR nip = $1',
                [s.user]
            );
            const dbUser = userResult.rows[0];
            const rawUser = s.user;
            const rawNip = dbUser?.nip || '';

            return {
                ...s,
                user: rawUser,
                bandwidth_limit: dbUser?.bandwidth_limit || 'N/A',
                website_block:   dbUser?.website_block   || '',
                full_name:       dbUser?.full_name       || rawUser,
                nip:             rawNip,
                jabatan:         dbUser?.jabatan         || '',
                instansi:        dbUser?.instansi        || '',
            };
        }));

        if (isVisitor) {
            enriched = sanitizeVisitorData(enriched);
        }

        res.json({ success: true, data: enriched });
    } catch (err) {
        console.error('[HotspotRouterController] getActiveSessions:', err.message);
        res.status(500).json({ success: false, message: 'Gagal mengambil sesi aktif.' });
    }
};

const kickActiveSession = async (req, res) => {
    const { id } = req.params;
    const check = parseRouterId(req.query.router_id);
    if (!check.valid) {
        return res.status(400).json({ success: false, message: check.message });
    }

    try {
        const rResult = await query('SELECT * FROM routers WHERE id = $1', [check.id]);
        if (rResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Router tidak ditemukan.' });
        }

        await mikrotik.removeHotspotActive(rResult.rows[0], id);
        res.json({ success: true, message: 'Sesi aktif berhasil diputus (kick).' });
    } catch (err) {
        console.error('[HotspotRouterController] kickActiveSession:', err.message);
        res.status(500).json({ success: false, message: 'Gagal memutus sesi aktif.' });
    }
};

const getHosts = async (req, res) => {
    const check = parseRouterId(req.query.router_id);
    if (!check.valid) {
        return res.status(400).json({ success: false, message: check.message });
    }

    try {
        const rResult = await query('SELECT * FROM routers WHERE id = $1', [check.id]);
        if (rResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Router tidak ditemukan.' });
        }

        const isVisitor = req.admin && req.admin.role === 'visitor';
        const { sanitizeVisitorData } = require('../middleware/adminAuth');

        const hosts = await mikrotik.getHotspotHosts(rResult.rows[0]);
        let processedHosts = hosts;
        if (isVisitor) {
            processedHosts = sanitizeVisitorData(processedHosts);
        }
        res.json({ success: true, data: processedHosts });
    } catch (err) {
        console.error('[HotspotRouterController] getHosts:', err.message);
        res.status(500).json({ success: false, message: 'Gagal mengambil host terhubung.' });
    }
};

const removeHost = async (req, res) => {
    const { id } = req.params;
    const check = parseRouterId(req.query.router_id);
    if (!check.valid) {
        return res.status(400).json({ success: false, message: check.message });
    }

    try {
        const rResult = await query('SELECT * FROM routers WHERE id = $1', [check.id]);
        if (rResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Router tidak ditemukan.' });
        }

        await mikrotik.removeHotspotHost(rResult.rows[0], id);
        res.json({ success: true, message: 'Host berhasil dihapus.' });
    } catch (err) {
        console.error('[HotspotRouterController] removeHost:', err.message);
        res.status(500).json({ success: false, message: 'Gagal menghapus host.' });
    }
};

const toggleBypassHost = async (req, res) => {
    const { router_id, mac, bypass } = req.body;
    const check = parseRouterId(router_id);
    if (!check.valid) {
        return res.status(400).json({ success: false, message: check.message });
    }
    if (!mac || bypass === undefined) {
        return res.status(400).json({ success: false, message: 'mac dan bypass wajib diisi.' });
    }

    try {
        const rResult = await query('SELECT * FROM routers WHERE id = $1', [check.id]);
        if (rResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Router tidak ditemukan.' });
        }

        await mikrotik.toggleHotspotHostBypass(rResult.rows[0], mac, bypass);
        res.json({ success: true, message: `Bypass status untuk MAC ${mac} berhasil diubah.` });
    } catch (err) {
        console.error('[HotspotRouterController] toggleBypassHost:', err.message);
        res.status(500).json({ success: false, message: 'Gagal mengubah status bypass host.' });
    }
};

const getRouterUsers = async (req, res) => {
    const check = parseRouterId(req.query.router_id);
    if (!check.valid) {
        return res.status(400).json({ success: false, message: check.message });
    }

    try {
        const rResult = await query('SELECT * FROM routers WHERE id = $1', [check.id]);
        if (rResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Router tidak ditemukan.' });
        }

        const isVisitor = req.admin && req.admin.role === 'visitor';
        const { sanitizeVisitorData } = require('../middleware/adminAuth');

        const users = await mikrotik.getRouterHotspotUsers(rResult.rows[0]);
        let filteredUsers = users
            .filter(u => u.name !== 'default-trial')
            .map(u => ({
                ...u,
                password: isVisitor ? '••••••••' : (u.password ? '••••••••' : ''),
            }));

        if (isVisitor) {
            filteredUsers = sanitizeVisitorData(filteredUsers);
        }
        res.json({ success: true, data: filteredUsers });
    } catch (err) {
        console.error('[HotspotRouterController] getRouterUsers:', err.message);
        res.status(500).json({ success: false, message: 'Gagal mengambil user router.' });
    }
};

const removeRouterUser = async (req, res) => {
    const { id } = req.params;
    const check = parseRouterId(req.query.router_id);
    if (!check.valid) {
        return res.status(400).json({ success: false, message: check.message });
    }

    try {
        const rResult = await query('SELECT * FROM routers WHERE id = $1', [check.id]);
        if (rResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Router tidak ditemukan.' });
        }

        await mikrotik.removeRouterHotspotUser(rResult.rows[0], id);
        res.json({ success: true, message: 'User router berhasil dihapus.' });
    } catch (err) {
        console.error('[HotspotRouterController] removeRouterUser:', err.message);
        res.status(500).json({ success: false, message: 'Gagal menghapus user router.' });
    }
};

const getBindings = async (req, res) => {
    const check = parseRouterId(req.query.router_id);
    if (!check.valid) {
        return res.status(400).json({ success: false, message: check.message });
    }

    try {
        const rResult = await query('SELECT * FROM routers WHERE id = $1', [check.id]);
        if (rResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Router tidak ditemukan.' });
        }

        const bindings = await mikrotik.getHotspotBindings(rResult.rows[0]);
        res.json({ success: true, data: bindings });
    } catch (err) {
        console.error('[HotspotRouterController] getBindings:', err.message);
        res.status(500).json({ success: false, message: 'Gagal mengambil IP Bindings.' });
    }
};

const addBinding = async (req, res) => {
    const { router_id, macAddress, address, toAddress, server, type, comment } = req.body;
    const check = parseRouterId(router_id);
    if (!check.valid) {
        return res.status(400).json({ success: false, message: check.message });
    }
    if (!macAddress && !address) {
        return res.status(400).json({ success: false, message: 'Minimal MAC Address atau IP Address harus diisi.' });
    }

    try {
        const rResult = await query('SELECT * FROM routers WHERE id = $1', [check.id]);
        if (rResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Router tidak ditemukan.' });
        }

        await mikrotik.addHotspotBinding(rResult.rows[0], { macAddress, address, toAddress, server, type, comment });
        res.json({ success: true, message: 'IP Binding berhasil ditambahkan.' });
    } catch (err) {
        console.error('[HotspotRouterController] addBinding:', err.message);
        res.status(500).json({ success: false, message: 'Gagal menambahkan IP Binding.' });
    }
};

const removeBinding = async (req, res) => {
    const { id } = req.params;
    const check = parseRouterId(req.query.router_id);
    if (!check.valid) {
        return res.status(400).json({ success: false, message: check.message });
    }

    try {
        const rResult = await query('SELECT * FROM routers WHERE id = $1', [check.id]);
        if (rResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Router tidak ditemukan.' });
        }

        await mikrotik.removeHotspotBinding(rResult.rows[0], id);
        res.json({ success: true, message: 'IP Binding berhasil dihapus.' });
    } catch (err) {
        console.error('[HotspotRouterController] removeBinding:', err.message);
        res.status(500).json({ success: false, message: 'Gagal menghapus IP Binding.' });
    }
};

module.exports = {
    getActiveSessions,
    kickActiveSession,
    getHosts,
    removeHost,
    toggleBypassHost,
    getRouterUsers,
    removeRouterUser,
    getBindings,
    addBinding,
    removeBinding,
};

