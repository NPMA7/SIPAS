# =============================================================================
#     MIKROTIK SIPAS SETUP - ROUTEROS v7 (CCR2116-12G-4S+)
# =============================================================================
# Router      : Mikrotik CCR2116-12G-4S+ (16 Core ARM64, 16GB RAM)
# Interface berdasarkan Winbox Anda:
#   - WAN-ether1    : WAN / Internet dari ISP
#   - LAN-ether2    : Dedicated Mini PC Server SIPAS (10.100.100.1/24)
#   - "vlan - TIK"    : Interface VLAN 101 (Subnet: 10.87.1.0/24 -> Gateway: 10.87.1.1)
#   - "vlan - KORPRI" : Interface VLAN 138 (Subnet: 10.87.38.0/24 -> Gateway: 10.87.38.1)
# =============================================================================

# --- 1. PASTIKAN IP ADDRESS GATEWAY TERPASANG ---
/ip address
add address=10.100.100.1/24 interface=LAN-ether2 comment="Gateway Dedicated Server Mini PC (Isolasi)" disabled=no
# (Catatan: Jika IP VLAN 101 & 138 belum ada, aktifkan 2 baris di bawah ini):
# add address=10.87.1.1/24 interface="vlan - TIK" comment="Gateway Hotspot VLAN 101 TIK"
# add address=10.87.38.1/24 interface="vlan - KORPRI" comment="Gateway Hotspot VLAN 138 KORPRI"

# --- 2. DHCP POOL & DHCP SERVER (Jika belum dibuat) ---
/ip pool
add name=pool-tik ranges=10.87.1.10-10.87.1.254 comment="Pool IP VLAN 101 TIK (.2-.9 Static/AP)"
add name=pool-korpri ranges=10.87.38.10-10.87.38.254 comment="Pool IP VLAN 138 KORPRI (.2-.9 Static/AP)"

/ip dhcp-server
add name=dhcp-tik interface="vlan-TIK" address-pool=pool-tik lease-time=01:00:00 disabled=no
add name=dhcp-korpri interface="vlan-KORPRI" address-pool=pool-korpri lease-time=01:00:00 disabled=no

/ip dhcp-server network
add address=10.87.1.0/24 gateway=10.87.1.1 dns-server=10.87.1.1,8.8.8.8 netmask=24 comment="Subnet Hotspot VLAN 101 TIK"
add address=10.87.38.0/24 gateway=10.87.38.1 dns-server=10.87.38.1,8.8.8.8 netmask=24 comment="Subnet Hotspot VLAN 138 KORPRI"

# --- 3. DNS ROUTER & STATIC HOST ---
/ip dns
set servers=8.8.8.8,1.1.1.1 allow-remote-requests=yes

/ip dns static
add name=hotspot.net address=10.87.1.1 comment="Domain Gateway Hotspot TIK"
add name=hotspot.net address=10.87.38.1 comment="Domain Gateway Hotspot KORPRI"
add name=sipas.local address=10.100.100.10 comment="Domain Mini PC Server SIPAS"

# --- 4. AKTIFKAN API ROUTEROS & BUAT USER API BACKEND SIPAS ---
/ip service
set api port=8728 address=0.0.0.0/0 disabled=no
set winbox disabled=no
set www disabled=no

/user group add name=sipas-api-group policy=api,read,write,test,policy comment="Group API SIPAS"
/user add name=sipas-api group=sipas-api-group password="PasswordSipas123!" comment="User API Backend SIPAS"

# --- 5. BUAT PROFILE HOTSPOT SERVER (HTTP-PAP/CHAP & TEMPLATE SIPAS) ---
/ip hotspot profile
add name=hsprof-sipas hotspot-address=0.0.0.0 dns-name=hotspot.net login-by=http-chap,http-pap html-directory=hotspot http-cookie-lifetime=3d split-user-domain=no use-radius=no

/ip hotspot user profile
set [find default=yes] idle-timeout=00:05:00 keepalive-timeout=00:02:00 shared-users=4

# --- 6. AKTIFKAN HOTSPOT SERVER PADA INTERFACE "vlan-TIK" & "vlan-KORPRI" ---
/ip hotspot
add name=hs-tik interface="vlan-TIK" address-pool=none profile=hsprof-sipas idle-timeout=00:05:00 keepalive-timeout=00:02:00 disabled=no
add name=hs-korpri interface="vlan-KORPRI" address-pool=none profile=hsprof-sipas idle-timeout=00:05:00 keepalive-timeout=00:02:00 disabled=no

# --- 7. BYPASS IP SERVER MINI PC DARI HOTSPOT (WAJIB) ---
/ip hotspot ip-binding
add address=10.100.100.10 type=bypassed comment="Mini PC SIPAS Server - Bypass Hotspot"

# --- 8. WALLED GARDEN (AKSES KE SERVER & DOMAIN SEBELUM LOGIN) ---
/ip hotspot walled-garden
add dst-host=sipas.npma.my.id comment="Portal SIPAS Cloudflare"
add dst-host=*.npma.my.id comment="Subdomain NPMA"
add dst-host=*.cloudflare.com comment="CDN Cloudflare"
add dst-host=sipas.local comment="Domain Lokal Mini PC"
add dst-host=*.ruijienetworks.com comment="Bypass Ruijie Cloud Management"
add dst-host=*.djicdn.com comment="Bypass Ruijie CDN"

/ip hotspot walled-garden ip
add dst-address=10.100.100.10 protocol=tcp dst-port=3000 action=accept comment="Akses Web Portal SIPAS Mini PC (Port 3000)"
add dst-address=10.100.100.10 protocol=tcp dst-port=80 action=accept comment="Akses Web Portal SIPAS Mini PC (Port 80)"
add dst-address=10.100.100.10 action=accept comment="Akses Penuh ke Server Mini PC"

# --- 9. FAST TCP RESET & DNS REDIRECT UNTUK POP-UP OTOMATIS ---
/ip firewall nat
add chain=dstnat in-interface="vlan-TIK" protocol=udp dst-port=53 action=redirect comment="DNS UDP Redirect VLAN TIK"
add chain=dstnat in-interface="vlan-TIK" protocol=tcp dst-port=53 action=redirect comment="DNS TCP Redirect VLAN TIK"
add chain=dstnat in-interface="vlan-KORPRI" protocol=udp dst-port=53 action=redirect comment="DNS UDP Redirect VLAN KORPRI"
add chain=dstnat in-interface="vlan-KORPRI" protocol=tcp dst-port=53 action=redirect comment="DNS TCP Redirect VLAN KORPRI"

/ip firewall filter
add chain=hs-unauth protocol=tcp dst-port=443 action=reject reject-with=tcp-reset comment="Instant TCP RST for HTTPS Popup Trigger" place-before=0

:log info "Konfigurasi Hotspot VLAN TIK & KORPRI pada Mikrotik CCR2116 berhasil diterapkan!"
