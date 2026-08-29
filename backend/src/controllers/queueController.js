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

/**
 * GET /api/queues/:routerId
 * Ambil daftar Simple Queues dari router MikroTik
 */
const getQueues = async (req, res) => {
    const check = parseRouterId(req.params.routerId);
    if (!check.valid) {
        return res.status(400).json({ success: false, message: check.message });
    }

    try {
        const rResult = await query(
            'SELECT * FROM routers WHERE id = $1 AND is_active = TRUE',
            [check.id]
        );
        if (rResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Router tidak ditemukan.' });
        }

        const queues = await mikrotik.getSimpleQueues(rResult.rows[0]);

        const isVisitor = req.admin && req.admin.role === 'visitor';
        const { sanitizeVisitorData } = require('../middleware/adminAuth');

        let processedQueues = queues;
        if (isVisitor) {
            processedQueues = sanitizeVisitorData(processedQueues);
        }

        res.json({ success: true, data: processedQueues, count: processedQueues.length });
    } catch (err) {
        console.error('[QueueController] getQueues:', err.message);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil daftar Queues.'
        });
    }
};

/**
 * POST /api/queues/:routerId/action
 * Eksekusi aksi pada Simple Queue (enable, disable, remove)
 */
const actionQueue = async (req, res) => {
    const check = parseRouterId(req.params.routerId);
    if (!check.valid) {
        return res.status(400).json({ success: false, message: check.message });
    }

    try {
        const { queue_id, action } = req.body;
        if (!queue_id || !action) {
            return res.status(400).json({ success: false, message: 'queue_id dan action wajib diisi.' });
        }

        const rResult = await query(
            'SELECT * FROM routers WHERE id = $1 AND is_active = TRUE',
            [check.id]
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
