const { query } = require('../config/db');
const mikrotik = require('../services/mikrotikService');

const getLeases = async (req, res) => {
    const { router_id } = req.query;
    if (!router_id) {
        return res.status(400).json({ success: false, message: 'router_id wajib diisi.' });
    }

    try {
        const rResult = await query('SELECT * FROM routers WHERE id = $1', [router_id]);
        if (rResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Router tidak ditemukan.' });
        }

        const leases = await mikrotik.getDhcpLeases(rResult.rows[0]);

        const isVisitor = req.admin && req.admin.role === 'visitor';
        const { maskSensitiveText } = require('../middleware/adminAuth');

        const processedLeases = leases.map(l => ({
            ...l,
            address: isVisitor && l.address ? maskSensitiveText(l.address, 6, 2) : l.address,
            mac_address: isVisitor && (l.mac_address || l['mac-address']) ? maskSensitiveText(l.mac_address || l['mac-address'], 5, 2) : (l.mac_address || l['mac-address']),
            'mac-address': isVisitor && (l.mac_address || l['mac-address']) ? maskSensitiveText(l.mac_address || l['mac-address'], 5, 2) : (l.mac_address || l['mac-address']),
        }));

        res.json({ success: true, data: processedLeases });
    } catch (err) {
        console.error('[DHCPController] getLeases:', err.message);
        res.status(500).json({ success: false, message: err.message || 'Gagal mengambil DHCP leases.' });
    }
};

const deleteLease = async (req, res) => {
    const { id } = req.params;
    const { router_id } = req.query;
    if (!router_id) {
        return res.status(400).json({ success: false, message: 'router_id wajib diisi.' });
    }

    try {
        const rResult = await query('SELECT * FROM routers WHERE id = $1', [router_id]);
        if (rResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Router tidak ditemukan.' });
        }

        await mikrotik.removeDhcpLease(rResult.rows[0], id);
        res.json({ success: true, message: 'DHCP lease berhasil dihapus.' });
    } catch (err) {
        console.error('[DHCPController] deleteLease:', err.message);
        res.status(500).json({ success: false, message: err.message || 'Gagal menghapus DHCP lease.' });
    }
};

module.exports = {
    getLeases,
    deleteLease,
};
