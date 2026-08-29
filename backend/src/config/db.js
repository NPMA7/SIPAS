const path = require('path');
require('dotenv').config();
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { Pool } = require('pg');

const dbHost = process.env.DB_HOST || 'localhost';

const pool = new Pool({
    host:     dbHost,
    port:     parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME     || 'hotspot_db',
    user:     process.env.DB_USER     || 'hotspot_user',
    password: process.env.DB_PASSWORD || '',

    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

pool.on('connect', () => {
    console.log('[DB] Connected to PostgreSQL at', dbHost);
});

// Auto-migration ringan untuk mendukung SSO, Tipe Router, Max Devices, & Admin Roles
(async () => {
    try {
        const bcrypt = require('bcrypt');

        await pool.query(`
            ALTER TABLE hotspot_users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'local';
            ALTER TABLE hotspot_users ADD COLUMN IF NOT EXISTS nip VARCHAR(50);
            ALTER TABLE hotspot_users ADD COLUMN IF NOT EXISTS jabatan VARCHAR(150);
            ALTER TABLE hotspot_users ADD COLUMN IF NOT EXISTS instansi VARCHAR(150);
            ALTER TABLE hotspot_users ADD COLUMN IF NOT EXISTS max_devices INTEGER DEFAULT 4;
            ALTER TABLE routers ADD COLUMN IF NOT EXISTS router_type VARCHAR(20) DEFAULT 'internal';
            ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS role VARCHAR(30) DEFAULT 'admin';

            -- Data cleanup untuk website_block bawaan seed lama
            UPDATE hotspot_users SET website_block = '' WHERE LOWER(website_block) = 'false' OR website_block = '0';
            UPDATE hotspot_users SET website_block = 'npma' WHERE LOWER(website_block) = 'true';

            -- Table untuk Kustomisasi Portal Login
            CREATE TABLE IF NOT EXISTS portal_settings (
                id INTEGER PRIMARY KEY DEFAULT 1,
                portal_title VARCHAR(150) DEFAULT 'Portal SIPAS',
                portal_subtitle VARCHAR(255) DEFAULT 'Sistem Integrasi Portal & Autentikasi Satu-Pintu',
                bg_type VARCHAR(20) DEFAULT 'color',
                bg_color VARCHAR(30) DEFAULT '#0a0e1a',
                bg_image TEXT,
                bg_blur INTEGER DEFAULT 0,
                bg_overlay_opacity INTEGER DEFAULT 60,
                card_opacity INTEGER DEFAULT 95,
                primary_color VARCHAR(30) DEFAULT '#2563eb',
                logo_type VARCHAR(20) DEFAULT 'default',
                logo_custom TEXT,
                footer_text VARCHAR(255) DEFAULT 'Butuh bantuan? Hubungi administrator jaringan',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            INSERT INTO portal_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
        `);

        // Seed Superadmin default: npma / kohaku99
        const npmaHash = await bcrypt.hash('kohaku99', 12);
        await pool.query(`
            INSERT INTO admin_users (username, password_hash, full_name, email, role, is_active)
            VALUES ('npma', $1, 'Super Administrator (NPMA)', 'admin@npma.my.id', 'superadmin', true)
            ON CONFLICT (username) DO UPDATE
            SET password_hash = EXCLUDED.password_hash, role = 'superadmin', is_active = true, full_name = EXCLUDED.full_name;
        `, [npmaHash]);

        console.log('[DB] Auto-migration SSO, Router Type, Max Devices, Portal Settings, & Superadmin npma initialized successfully');
    } catch (err) {
        console.warn('[DB] Auto-migration warning:', err.message);
    }
})();


pool.on('error', (err) => {
    console.error('[DB] Unexpected error:', err.message);
});

/**
 * Execute a query
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 */
const query = async (text, params) => {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[DB] Query executed in ${duration}ms`);
        }
        return result;
    } catch (err) {
        console.error('[DB] Query error:', err.message);
        throw err;
    }
};

module.exports = { pool, query };
