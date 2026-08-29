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

const getLeases = async (req, res) => {
    const check = parseRouterId(req.query.router_id);
    if (!check.valid) {
        return res.status(400).json({ success: false, message: check.message });
    }

    try {
        const rResult = await query('SELECT * FROM routers WHERE id = $1', [check.id]);
        if (rResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Router tidak ditemukan.' });
        }

        const leases = await mikrotik.getDhcpLeases(rResult.rows[0]);

        const isVisitor = req.admin && req.admin.role === 'visitor';
        const { sanitizeVisitorData } = require('../middleware/adminAuth');

        let processedLeases = leases;
        if (isVisitor) {
            processedLeases = sanitizeVisitorData(processedLeases);
        }

        res.json({ success: true, data: processedLeases });
    } catch (err) {
        console.error('[DHCPController] getLeases:', err.message);
        res.status(500).json({ success: false, message: 'Gagal mengambil DHCP leases.' });
    }
};

const deleteLease = async (req, res) => {
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

        await mikrotik.removeDhcpLease(rResult.rows[0], id);
        res.json({ success: true, message: 'DHCP lease berhasil dihapus.' });
    } catch (err) {
        console.error('[DHCPController] deleteLease:', err.message);
        res.status(500).json({ success: false, message: 'Gagal menghapus DHCP lease.' });
    }
};

module.exports = {
    getLeases,
    deleteLease,
};
