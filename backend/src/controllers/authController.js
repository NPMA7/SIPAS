const { query }          = require('../config/db');
const mikrotik           = require('../services/mikrotikService');
const ssoService         = require('../services/ssoService');

/**
 * Helper: Ambil konfigurasi router dari DB berdasarkan ID
 */
const getRouterConfig = async (routerId) => {
    const result = await query('SELECT * FROM routers WHERE id = $1 AND is_active = TRUE', [routerId]);
    if (result.rows.length === 0) throw new Error('Router tidak ditemukan atau tidak aktif.');
    return result.rows[0];
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/portal/login
 * Alur login captive portal Hybrid (SSO + Master Data DB SIPAS):
 *  1. Cari user di database PostgreSQL SIPAS.
 *  2. Jika user tipe SSO atau tidak ditemukan di DB, lakukan autentikasi ke SSO .
 *  3. Ambil profil bandwidth & website block dari DB SIPAS (atau auto-provision jika user baru).
 *  4. Buat hotspot user sementara & Simple Queue di Mikrotik.
 *  5. Kembalikan link untuk authenticate ke Mikrotik.
 */
const portalLogin = async (req, res) => {
    const { username, password, ip, mac, router_id, link_login } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username dan password wajib diisi.' });
    }

    const cleanUsername = username.toLowerCase().trim();

    try {
        // 1. Cari user di database PostgreSQL SIPAS
        const userResult = await query(
            `SELECT hu.*, r.ip_address as router_ip, r.api_port, r.api_username, r.api_password,
                    r.name as router_name
             FROM hotspot_users hu
             LEFT JOIN routers r ON hu.router_id = r.id
             WHERE hu.username = $1 AND hu.is_active = TRUE`,
            [cleanUsername]
        );

        let user = userResult.rows.length > 0 ? userResult.rows[0] : null;
        let isSSOAuth = false;

        if (user) {
            if (user.auth_provider === 'sso') {
                isSSOAuth = true;
            } else {
                // User Lokal -> Validasi password DB
                if (user.password !== password) {
                    return res.status(401).json({ success: false, message: 'Username atau password salah.' });
                }
            }
        } else {
            // User tidak ada di DB lokal -> Coba verifikasi ke SSO 
            isSSOAuth = true;
        }

        // 2. Jika merupakan Autentikasi SSO 
        if (isSSOAuth) {
            try {
                const ssoRes = await ssoService.loginSSO(cleanUsername, password);
                const ssoUser = ssoRes.data || {};

                const namaPegawai = ssoUser.nama || cleanUsername;
                const nipPegawai  = ssoUser.nip || cleanUsername;
                const jabatanPeg  = ssoUser.jabatan || '';
                const golPegawai  = ssoUser.golongan ? `Gol. ${ssoUser.golongan}` : (user?.instansi || '');

                if (user) {
                    // Update metadata dari SSO ke DB lokal jika ada perubahan di server SSO pusat
                    await query(
                        `UPDATE hotspot_users SET full_name = $1, nip = $2, jabatan = $3, instansi = $4, updated_at = NOW() WHERE id = $5`,
                        [namaPegawai, nipPegawai, jabatanPeg, golPegawai || user.instansi || '', user.id]
                    );
                    user.full_name = namaPegawai;
                    user.nip = nipPegawai;
                    user.jabatan = jabatanPeg;
                    user.instansi = golPegawai || user.instansi || '';
                } else {
                    // Auto-provisioning user ASN baru ke Database PostgreSQL SIPAS (Default 30M/30M)
                    const insertRes = await query(
                        `INSERT INTO hotspot_users (username, password, full_name, email, nip, jabatan, instansi, auth_provider, bandwidth_limit, website_block)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, 'sso', '30M/30M', '')
                         RETURNING *`,
                        [cleanUsername, '[SSO_AUTH]', namaPegawai, '', nipPegawai, jabatanPeg, golPegawai]
                    );
                    user = insertRes.rows[0];
                }

            } catch (ssoErr) {
                return res.status(401).json({
                    success: false,
                    message: ssoErr.message || 'Username atau password tidak valid.'
                });
            }
        }


        // 3. Tentukan router target
        let routerConfig = null;

        // Coba deteksi dari link_login yang dikirim oleh portal login
        if (link_login) {
            let detectedRouterIp = null;
            try {
                const url = new URL(link_login);
                detectedRouterIp = url.hostname;
            } catch (_) {
                const match = link_login.match(/https?:\/\/([^\/:]+)/);
                if (match) detectedRouterIp = match[1];
            }

            if (detectedRouterIp) {
                const rResult = await query(
                    'SELECT * FROM routers WHERE (ip_address = $1 OR name ILIKE $1) AND is_active = TRUE',
                    [detectedRouterIp]
                );
                if (rResult.rows.length > 0) {
                    routerConfig = rResult.rows[0];
                }
            }
        }

        // Fallback ke router_id dari request body jika tidak terdeteksi dari link_login
        if (!routerConfig && router_id) {
            const rResult = await query('SELECT * FROM routers WHERE id = $1 AND is_active = TRUE', [router_id]);
            if (rResult.rows.length > 0) {
                routerConfig = rResult.rows[0];
            }
        }

        // Fallback ke user.router_id dari profile DB jika masih belum terdeteksi
        if (!routerConfig && user.router_id) {
            const rResult = await query('SELECT * FROM routers WHERE id = $1 AND is_active = TRUE', [user.router_id]);
            if (rResult.rows.length > 0) {
                routerConfig = rResult.rows[0];
            }
        }

        // Fallback ke router aktif pertama di DB (terutama jika user di-set ke 'Semua Router' / user.router_id null)
        if (!routerConfig) {
            const activeRouters = await query('SELECT * FROM routers WHERE is_active = TRUE ORDER BY id ASC');
            if (activeRouters.rows.length > 0) {
                routerConfig = activeRouters.rows[0];
            }
        }

        if (!routerConfig) {
            return res.status(400).json({ success: false, message: 'Router tidak terkonfigurasi untuk user ini.' });
        }

        // Jika user dibatasi hanya untuk router tertentu (user.router_id tidak null), pastikan router yang dituju sesuai
        if (user.router_id && user.router_id !== routerConfig.id) {
            return res.status(403).json({ success: false, message: 'Akun Anda tidak terdaftar untuk digunakan di router ini.' });
        }

        // 4. Jika Router Tipe Vendor / Eksternal -> Lewati Konfigurasi Mikrotik API (Portal Auth Only)
        if (routerConfig.router_type === 'external') {
            console.log(`[AuthController] Router Vendor/Eksternal (${routerConfig.name}): Autentikasi portal berhasil tanpa API Mikrotik.`);
        } else {
            // Router Internal -> Lakukan Cek Sesi & Setup Mikrotik API
            try {
                const maxAllowedDevices = user.max_devices ? parseInt(user.max_devices) : 4;
                const activeSessions = await mikrotik.getActiveHotspotUsers(routerConfig);

                const userActiveSessions = activeSessions.filter(
                    s => s.user && s.user.toLowerCase() === username.toLowerCase()
                );

                const currentMacClean = (mac || '').toLowerCase().trim();
                const existingSameMacSession = userActiveSessions.find(
                    s => (s.mac || s['mac-address'] || '').toLowerCase().trim() === currentMacClean
                );

                if (existingSameMacSession) {
                    // Reconnect dari MAC yang sama -> Tendang sesi lama dari MAC tersebut
                    console.log(`[AuthController] Menendang sesi usang untuk MAC yang sama: ${currentMacClean}`);
                    await mikrotik.removeHotspotActive(routerConfig, existingSameMacSession.id);
                } else if (userActiveSessions.length >= maxAllowedDevices) {
                    // Perangkat baru & batas max_devices telah tercapai
                    return res.status(409).json({
                        success: false,
                        error_code: 'max_devices_reached',
                        message: `Akun ini sudah terhubung di ${userActiveSessions.length} dari maksimal ${maxAllowedDevices} perangkat aktif. Silakan logout dari salah satu perangkat terlebih dahulu.`,
                        active_count: userActiveSessions.length,
                        max_devices: maxAllowedDevices
                    });
                }
            } catch (sessionCheckErr) {
                console.warn('[AuthController] Gagal cek sesi aktif, melanjutkan login:', sessionCheckErr.message);
            }

            // 5. Konfigurasi parameter user ke Mikrotik Internal di background (non-blocking)
            // Hal ini membuat HP menerima respon 'Autentikasi Berhasil' secara instan (< 200ms)
            const cleanUsername = username.toLowerCase().trim();
            mikrotik.setupPortalUser(
                routerConfig,
                cleanUsername,
                password,
                ip || null,
                mac || null,
                user.bandwidth_limit,
                user.website_block
            ).catch(sErr => console.warn('[AuthController] Background setupPortalUser warning:', sErr.message));
        }

        // 6. Bersihkan sesi DB lama (jika ada sisa) dan log sesi aktif baru ke DB
        await query(
            `UPDATE active_sessions SET logout_at = NOW()
             WHERE hotspot_user_id = $1 AND logout_at IS NULL`,
            [user.id]
        );
        await query(
            `INSERT INTO active_sessions (hotspot_user_id, router_id, ip_address, mac_address)
             VALUES ($1, $2, $3, $4)`,
            [user.id, routerConfig.id, ip || null, mac || null]
        );

        res.json({
            success: true,
            message: 'Autentikasi berhasil.',
            data: {
                username:        user.username,
                full_name:       user.full_name,
                bandwidth_limit: user.bandwidth_limit,
                website_block:   user.website_block,
                router_ip:       routerConfig.ip_address,
                // URL Mikrotik hotspot login untuk redirect frontend
                mikrotik_login_url: `http://${routerConfig.ip_address}/login`,
            }
        });

    } catch (err) {
        console.error('[AuthController] portalLogin error:', err.message);
        if (err.message.includes('Mikrotik API Error')) {
            return res.status(503).json({ success: false, message: `Gagal terhubung ke router: ${err.message}` });
        }
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

/**
 * POST /api/portal/logout
 * Logout user: hapus sesi, queue, dan entry dari address-list
 */
const portalLogout = async (req, res) => {
    const { username, ip, router_id } = req.body;

    if (!username) {
        return res.status(400).json({ success: false, message: 'Username wajib diisi.' });
    }

    try {
        const rResult = await query('SELECT * FROM routers WHERE id = $1 AND is_active = TRUE', [router_id]);
        if (rResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Router tidak ditemukan.' });
        }
        const routerConfig = rResult.rows[0];

        // Hapus dari hotspot user list Mikrotik
        await mikrotik.removeHotspotUser(routerConfig, username);

        // Hapus Simple Queue
        await mikrotik.removeSimpleQueue(routerConfig, username);

        // Hapus dari address list jika ada
        if (ip) await mikrotik.removeUserFromBlockList(routerConfig, ip);

        // Update log sesi di DB
        await query(
            `UPDATE active_sessions SET logout_at = NOW()
             WHERE hotspot_user_id = (SELECT id FROM hotspot_users WHERE username = $1)
             AND logout_at IS NULL`,
            [username]
        );

        res.json({ success: true, message: 'Logout berhasil.' });
    } catch (err) {
        console.error('[AuthController] portalLogout error:', err.message);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

module.exports = { portalLogin, portalLogout };
