# =============================================================================
#     MIKROTIK CCR FULL HOTSPOT & SIPAS SETUP SCRIPT (UNTUK VENDOR)
# =============================================================================
# Konfigurasi:
#   - Dedicated Server Mini PC (ether2) : 10.100.100.10
#   - Domain Captive Portal             : https://sipas.npma.my.id/
# =============================================================================

# --- 1. AKTIFKAN API ROUTEROS & BUAT USER API BACKEND ---
/ip service set api port=8728 address=0.0.0.0/0 disabled=no
/user group add name=sipas-api-group policy=api,read,write,test,policy comment="Group API SIPAS"
/user add name=sipas-api group=sipas-api-group password="PasswordSipas123!" comment="User API Backend SIPAS"

# --- 2. BUAT PROFILE HOTSPOT SERVER (HTTP-PAP/CHAP & TEMPLATE SIPAS) ---
/ip hotspot profile
add name=hsprof-sipas dns-name=hotspot.net login-by=http-chap,http-pap html-directory=hotspot http-cookie-lifetime=3d split-user-domain=no use-radius=no

/ip hotspot user profile
set [find default=yes] idle-timeout=00:05:00 keepalive-timeout=00:02:00 shared-users=1

# --- 3. AKTIFKAN HOTSPOT SERVER PADA INTERFACE / VLAN ---
# CATATAN UNTUK VENDOR:
# Ganti nama interface di bawah sesuai nama Interface Bridge / VLAN Hotspot yang aktif di CCR:
# Contoh A: Jika Hotspot dipasang di Bridge Hotspot:
# /ip hotspot add name=hotspot-main interface=bridge-hotspot profile=hsprof-sipas disabled=no

# Contoh B: Jika Hotspot dipasang per-VLAN (Aktifkan baris yang sesuai):
# /ip hotspot add name=hs-vlan10 interface=vlan10 profile=hsprof-sipas disabled=no
# /ip hotspot add name=hs-vlan20 interface=vlan20 profile=hsprof-sipas disabled=no
# /ip hotspot add name=hs-vlan30 interface=vlan30 profile=hsprof-sipas disabled=no
# /ip hotspot add name=hs-vlan40 interface=vlan40 profile=hsprof-sipas disabled=no

# --- 4. BYPASS IP SERVER MINI PC DARI CAPTIVE PORTAL (WAJIB) ---
# Agar Mini PC bebas akses internet/Cloudflare tanpa terhalang login captive portal
/ip hotspot ip-binding
add address=10.100.100.10 type=bypassed comment="Mini PC SIPAS Server - Bypass Hotspot"

# --- 5. WALLED GARDEN (BYPASS AKSES DOMAIN PORTAL SEBELUM LOGIN) ---
# Membuka akses bagi klien yang belum login agar bisa membuka domain portal HTTPS
/ip hotspot walled-garden
add dst-host=sipas.npma.my.id comment="Portal SIPAS Cloudflare"
add dst-host=*.npma.my.id comment="Subdomain SIPAS"
add dst-host=*.cloudflare.com comment="CDN Cloudflare"

/ip hotspot walled-garden ip
add dst-address=10.100.100.10 dst-port=3000 action=accept comment="Bypass Portal Port 3000"
add dst-address=10.100.100.10 dst-port=80 action=accept comment="Bypass Portal Port 80"

# --- 6. FAST TCP RESET UNTUK POP-UP OTOMATIS DI HP / LAPTOP ---
/ip firewall filter
add chain=hs-unauth protocol=tcp dst-port=443 action=reject reject-with=tcp-reset comment="Instant TCP RST for HTTPS Popup Trigger" place-before=0

:log info "Konfigurasi Hotspot & Integrasi SIPAS pada Mikrotik CCR berhasil diterapkan!"
