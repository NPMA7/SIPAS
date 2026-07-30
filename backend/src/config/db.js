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

// Auto-migration ringan untuk mendukung SSO Diskominfo
(async () => {
    try {
        await pool.query(`
            ALTER TABLE hotspot_users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'local';
            ALTER TABLE hotspot_users ADD COLUMN IF NOT EXISTS nip VARCHAR(50);
            ALTER TABLE hotspot_users ADD COLUMN IF NOT EXISTS jabatan VARCHAR(150);
            ALTER TABLE hotspot_users ADD COLUMN IF NOT EXISTS instansi VARCHAR(150);

        `);
        console.log('[DB] Auto-migration SSO columns initialized successfully');
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
