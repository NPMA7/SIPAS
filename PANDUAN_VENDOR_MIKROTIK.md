# PANDUAN SETUP IP HOTSPOT & INTEGRASI SIPAS (UNTUK VENDOR MIKROTIK CCR) 🌐⚙️

Dokumen ini berisi panduan bagi vendor/tim network untuk mengaktifkan **IP Hotspot Server** pada VLAN eksisting dan mengintegrasikannya dengan **Aplikasi SIPAS (Mini PC)**.

---

## 📌 1. Gambaran Parameter Jaringan
* Mini PC Server terhubung ke port dedicated `ether2` Mikrotik dengan IP: **`10.100.100.10/24`** (Gateway: **`10.100.100.1`**).
* Domain Captive Portal: **`https://sipas.npma.my.id/`**
* Port API RouterOS: **`8728`**

---

## 🛠️ 2. Script Konfigurasi RouterOS (Mikrotik CCR)

Jalankan perintah berikut di **New Terminal** Winbox (atau import file `CONFIG_VENDOR_CCR.rsc`):

```routeros
# =============================================================================
# 1. AKTIFKAN SERVICE API ROUTEROS (Port 8728) & BUAT USER API
# =============================================================================
/ip service set api port=8728 address=0.0.0.0/0 disabled=no

/user group add name=sipas-api-group policy=api,read,write,test,policy comment="Group API SIPAS"
/user add name=sipas-api group=sipas-api-group password="PasswordSipas123!" comment="User API Backend SIPAS"

# =============================================================================
# 2. BUAT PROFIL HOTSPOT SERVER (HTTP-PAP/CHAP & TEMPLATE SIPAS)
# =============================================================================
/ip hotspot profile
add name=hsprof-sipas dns-name=hotspot.net login-by=http-chap,http-pap html-directory=hotspot http-cookie-lifetime=3d split-user-domain=no use-radius=no

/ip hotspot user profile
set [find default=yes] idle-timeout=00:05:00 keepalive-timeout=00:02:00 shared-users=1

# =============================================================================
# 3. AKTIFKAN HOTSPOT SERVER PADA INTERFACE / VLAN
# =============================================================================
# Pilihan A (Jika Hotspot dipasang di Bridge Hotspot):
# /ip hotspot add name=hotspot-main interface=bridge-hotspot profile=hsprof-sipas disabled=no

# Pilihan B (Jika Hotspot dipasang per-VLAN):
# /ip hotspot add name=hs-vlan10 interface=vlan10 profile=hsprof-sipas disabled=no
# /ip hotspot add name=hs-vlan20 interface=vlan20 profile=hsprof-sipas disabled=no
# /ip hotspot add name=hs-vlan30 interface=vlan30 profile=hsprof-sipas disabled=no
# /ip hotspot add name=hs-vlan40 interface=vlan40 profile=hsprof-sipas disabled=no

# =============================================================================
# 4. BYPASS IP SERVER MINI PC DARI CAPTIVE PORTAL (WAJIB)
# =============================================================================
/ip hotspot ip-binding
add address=10.100.100.10 type=bypassed comment="Mini PC SIPAS Server - Bypass Hotspot"

# =============================================================================
# 5. WALLED GARDEN (AKSES DOMAIN PORTAL SEBELUM LOGIN)
# =============================================================================
/ip hotspot walled-garden
add dst-host=sipas.npma.my.id comment="Portal SIPAS Cloudflare"
add dst-host=*.npma.my.id comment="Subdomain SIPAS"
add dst-host=*.cloudflare.com comment="CDN Cloudflare"

/ip hotspot walled-garden ip
add dst-address=10.100.100.10 dst-port=3000 action=accept comment="Bypass Portal Port 3000"
add dst-address=10.100.100.10 dst-port=80 action=accept comment="Bypass Portal Port 80"

# =============================================================================
# 6. FAST TCP RESET UNTUK POP-UP OTOMATIS DI HP / LAPTOP
# =============================================================================
/ip firewall filter
add chain=hs-unauth protocol=tcp dst-port=443 action=reject reject-with=tcp-reset comment="Instant TCP RST for HTTPS Popup Trigger" place-before=0
```

---

## 📁 3. Upload File Template Hotspot
* Upload / replace folder **`hotspot`** (dari folder `flash/hotspot/`) ke menu **Files** di Winbox Mikrotik CCR.

---

## 📋 4. Data Konfirmasi dari Vendor
Setelah konfigurasi dipasang, mohon konfirmasi data berikut:
1. **IP Mikrotik (Gateway Mini PC)**: `....................` (Contoh: `10.100.100.1`)
2. **Port API**: `8728`
3. **Username API**: `sipas-api`
4. **Password API**: `....................`
