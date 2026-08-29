const { query } = require('../config/db');
const mikrotik = require('../services/mikrotikService');

/**
 * GET /api/queues/:routerId
 * Ambil daftar Simple Queues dari router MikroTik
 */
const getQueues = async (req, res) => {
    try {
        const rResult = await query(
            'SELECT * FROM routers WHERE id = $1 AND is_active = TRUE',
            [req.params.routerId]
        );
        if (rResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Router tidak ditemukan.' });
        }

        const queues = await mikrotik.getSimpleQueues(rResult.rows[0]);

        const isVisitor = req.admin && req.admin.role === 'visitor';
        const { maskSensitiveText } = require('../middleware/adminAuth');

        const processedQueues = queues.map(q => {
            let name = q.name || '';
            if (isVisitor && name.startsWith('hotspot-') && name.length > 12) {
                const nipPart = name.replace('hotspot-', '');
                name = `hotspot-${maskSensitiveText(nipPart, 4, 3)}`;
            }
            return {
                ...q,
                name,
                target: isVisitor && q.target ? maskSensitiveText(q.target, 6, 4) : q.target,
            };
        });

        res.json({ success: true, data: processedQueues, count: processedQueues.length });
    } catch (err) {
        console.error('[QueueController] getQueues:', err.message);
        res.status(503).json({
            success: false,
            message: `Gagal mengambil daftar Queues: ${err.message}`
        });
    }
};

/**
 * POST /api/queues/:routerId/action
 * Eksekusi aksi pada Simple Queue (enable, disable, remove)
 */
const actionQueue = async (req, res) => {
    try {
        const { queue_id, action } = req.body;
        if (!queue_id || !action) {
            return res.status(400).json({ success: false, message: 'queue_id dan action wajib diisi.' });
        }

        const rResult = await query(
            'SELECT * FROM routers WHERE id = $1 AND is_active = TRUE',
            [req.params.routerId]
        );
        if (rResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Router tidak ditemukan.' });
        }

        const result = await mikrotik.manageSimpleQueue(rResult.rows[0], queue_id, action);
        res.json({ success: true, message: result.message });
    } catch (err) {
        console.error('[QueueController] actionQueue:', err.message);
        res.status(500).json({
            success: false,
            message: `Gagal memproses queue: ${err.message}`
        });
    }
};

module.exports = { getQueues, actionQueue };
