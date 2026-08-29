const { query } = require('../config/db');

const DEFAULT_SETTINGS = {
    portal_title: 'Portal SIPAS',
    portal_subtitle: 'Sistem Integrasi Portal & Autentikasi Satu-Pintu',
    bg_type: 'color',
    bg_color: '#0a0e1a',
    bg_image: null,
    bg_blur: 0,
    bg_overlay_opacity: 60,
    card_bg_color: '#111827',
    card_opacity: 95,
    primary_color: '#2563eb',
    logo_type: 'default',
    logo_custom: null,
    footer_text: 'Butuh bantuan? Hubungi administrator jaringan',
};

/**
 * GET /api/portal-settings
 * Mengambil pengaturan tampilan portal login
 */
const getSettings = async (req, res) => {
    try {
        const result = await query('SELECT * FROM portal_settings WHERE id = 1');
        if (result.rows.length === 0) {
            return res.json({ success: true, data: DEFAULT_SETTINGS });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('[PortalSettingsController] getSettings:', err.message);
        res.status(500).json({ success: false, message: 'Gagal memuat pengaturan portal.' });
    }
};

/**
 * PUT /api/portal-settings
 * Mengubah pengaturan tampilan portal login
 */
const updateSettings = async (req, res) => {
    const {
        portal_title,
        portal_subtitle,
        bg_type,
        bg_color,
        bg_image,
        bg_blur,
        bg_overlay_opacity,
        card_bg_color,
        card_opacity,
        primary_color,
        logo_type,
        logo_custom,
        footer_text
    } = req.body;

    try {
        const result = await query(`
            INSERT INTO portal_settings (
                id, portal_title, portal_subtitle, bg_type, bg_color, bg_image,
                bg_blur, bg_overlay_opacity, card_bg_color, card_opacity, primary_color,
                logo_type, logo_custom, footer_text, updated_at
            )
            VALUES (
                1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
                portal_title = EXCLUDED.portal_title,
                portal_subtitle = EXCLUDED.portal_subtitle,
                bg_type = EXCLUDED.bg_type,
                bg_color = EXCLUDED.bg_color,
                bg_image = EXCLUDED.bg_image,
                bg_blur = EXCLUDED.bg_blur,
                bg_overlay_opacity = EXCLUDED.bg_overlay_opacity,
                card_bg_color = EXCLUDED.card_bg_color,
                card_opacity = EXCLUDED.card_opacity,
                primary_color = EXCLUDED.primary_color,
                logo_type = EXCLUDED.logo_type,
                logo_custom = EXCLUDED.logo_custom,
                footer_text = EXCLUDED.footer_text,
                updated_at = NOW()
            RETURNING *;
        `, [
            portal_title || DEFAULT_SETTINGS.portal_title,
            portal_subtitle !== undefined ? portal_subtitle : DEFAULT_SETTINGS.portal_subtitle,
            bg_type || 'color',
            bg_color || '#0a0e1a',
            bg_image || null,
            Number.isInteger(Number(bg_blur)) ? Number(bg_blur) : 0,
            Number.isInteger(Number(bg_overlay_opacity)) ? Number(bg_overlay_opacity) : 60,
            card_bg_color || '#111827',
            Number.isInteger(Number(card_opacity)) ? Number(card_opacity) : 95,
            primary_color || '#2563eb',
            logo_type || 'default',
            logo_custom || null,
            footer_text !== undefined ? footer_text : DEFAULT_SETTINGS.footer_text
        ]);

        res.json({
            success: true,
            message: 'Pengaturan tampilan portal berhasil disimpan.',
            data: result.rows[0]
        });
    } catch (err) {
        console.error('[PortalSettingsController] updateSettings:', err.message);
        res.status(500).json({ success: false, message: 'Gagal menyimpan pengaturan portal.' });
    }
};

/**
 * POST /api/portal-settings/reset
 * Reset pengaturan kembali ke default
 */
const resetSettings = async (req, res) => {
    try {
        const result = await query(`
            UPDATE portal_settings SET
                portal_title = $1,
                portal_subtitle = $2,
                bg_type = $3,
                bg_color = $4,
                bg_image = $5,
                bg_blur = $6,
                bg_overlay_opacity = $7,
                card_bg_color = $8,
                card_opacity = $9,
                primary_color = $10,
                logo_type = $11,
                logo_custom = $12,
                footer_text = $13,
                updated_at = NOW()
            WHERE id = 1
            RETURNING *;
        `, [
            DEFAULT_SETTINGS.portal_title,
            DEFAULT_SETTINGS.portal_subtitle,
            DEFAULT_SETTINGS.bg_type,
            DEFAULT_SETTINGS.bg_color,
            DEFAULT_SETTINGS.bg_image,
            DEFAULT_SETTINGS.bg_blur,
            DEFAULT_SETTINGS.bg_overlay_opacity,
            DEFAULT_SETTINGS.card_bg_color,
            DEFAULT_SETTINGS.card_opacity,
            DEFAULT_SETTINGS.primary_color,
            DEFAULT_SETTINGS.logo_type,
            DEFAULT_SETTINGS.logo_custom,
            DEFAULT_SETTINGS.footer_text
        ]);

        res.json({
            success: true,
            message: 'Pengaturan tampilan portal berhasil dikembalikan ke default.',
            data: result.rows[0] || DEFAULT_SETTINGS
        });
    } catch (err) {
        console.error('[PortalSettingsController] resetSettings:', err.message);
        res.status(500).json({ success: false, message: 'Gagal mereset pengaturan portal.' });
    }
};

module.exports = {
    getSettings,
    updateSettings,
    resetSettings,
};
