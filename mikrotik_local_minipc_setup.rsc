# =============================================================================
#     MIKROTIK SIPAS LOCAL SETUP SCRIPT (ETHER2 ISOLASI SERVER MINI PC)
# =============================================================================
# Topologi & Segmentasi Subnet Terpisah:
#   - ether1 : Internet / ISP WAN (DHCP Client)
#   - ether2 : Dedicated Server Mini PC SIPAS (IP Isolasi: 10.100.100.0/24)
#              (Mikrotik Gateway: 10.100.100.1 | Mini PC: 10.100.100.10)
#   - ether3-ether5 / wlan1 : Client Hotspot / AP (Subnet: 10.10.0.0/16)
#                             (Gateway Hotspot: 10.10.0.1)
# =============================================================================

# --- LANGKAH 1: Bridge Hotspot KHUSUS Client (ether2 TIDAK masuk bridge) ---
/interface bridge
add name=bridge-hotspot comment="Bridge Hotspot Klien (ether3-ether5)"

/interface bridge port
add bridge=bridge-hotspot interface=ether3 comment="Access Point / Client"
add bridge=bridge-hotspot interface=ether4 comment="Access Point / Client"
add bridge=bridge-hotspot interface=ether5 comment="Access Point / Client"

# --- LANGKAH 2: IP Address Interface (Segmentasi Terpisah) ---
/ip address
# 2.1 IP Interface ether2 (Segmen Khusus Server Mini PC)
add address=10.100.100.1/24 interface=ether2 comment="Gateway Dedicated Server Mini PC (Isolasi)"

# 2.2 IP Interface Bridge Hotspot (Segmen Khusus Client/User)
add address=10.10.0.1/16 interface=bridge-hotspot comment="Gateway Hotspot Klien Kelas A"

# --- LANGKAH 3: WAN / Internet dari ISP ---
/ip dhcp-client
add interface=ether1 disabled=no comment="Internet ISP"

/ip firewall nat
add chain=srcnat out-interface=ether1 action=masquerade comment="NAT Internet Masquerade"

# --- LANGKAH 4: DHCP Server untuk Client Hotspot (Subnet 10.10.0.0/16) ---
/ip pool
add name=pool-hotspot ranges=10.10.1.1-10.10.254.254 comment="Pool IP Hotspot (Kapasitas s/d 64.000 user)"

/ip dhcp-server
add name=dhcp-hotspot interface=bridge-hotspot address-pool=pool-hotspot lease-time=01:00:00 disabled=no

/ip dhcp-server network
add address=10.10.0.0/16 gateway=10.10.0.1 dns-server=10.10.0.1,8.8.8.8 netmask=16 comment="Subnet Hotspot Klien"

# --- LANGKAH 5: DNS Router & Static Host ---
/ip dns
set servers=8.8.8.8,1.1.1.1 allow-remote-requests=yes

/ip dns static
add name=hotspot.net address=10.10.0.1 comment="Domain Gateway Hotspot"
add name=sipas.local address=10.100.100.10 comment="Domain Mini PC Server SIPAS"

# --- LANGKAH 6: IP Service API untuk Backend Mini PC ---
/ip service
set api port=8728 address=0.0.0.0/0 disabled=no
set winbox disabled=no
set www disabled=no

# Buat User API khusus backend
/user group add name=sipas-api-group policy=api,read,write,test,policy comment="Group API SIPAS"
/user add name=sipas-api group=sipas-api-group password="PasswordSipas123!" comment="User API Backend SIPAS"

# --- LANGKAH 7: Hotspot Server Profile & Server (Hanya di bridge-hotspot) ---
/ip hotspot profile
add name=hsprof-sipas hotspot-address=10.10.0.1 dns-name=hotspot.net login-by=http-chap,http-pap html-directory=hotspot http-cookie-lifetime=3d split-user-domain=no use-radius=no

/ip hotspot
add name=hotspot1 interface=bridge-hotspot address-pool=none profile=hsprof-sipas idle-timeout=00:05:00 keepalive-timeout=00:02:00 disabled=no

/ip hotspot user profile
set [find default=yes] idle-timeout=00:05:00 keepalive-timeout=00:02:00 shared-users=1

# --- LANGKAH 8: WALLED GARDEN (IZIN AKSES KE SERVER & DOMAIN SEBELUM LOGIN) ---
/ip hotspot walled-garden
add server=hotspot1 dst-host=sipas.npma.my.id comment="Bypass Cloudflare Domain Portal"
add server=hotspot1 dst-host=*.npma.my.id comment="Bypass Subdomain NPMA"
add server=hotspot1 dst-host=*.cloudflare.com comment="Bypass Cloudflare CDN"
add server=hotspot1 dst-host=sipas.local comment="Bypass Domain Lokal"

/ip hotspot walled-garden ip
add dst-address=10.100.100.10 protocol=tcp dst-port=3000 action=accept comment="Akses Web Portal SIPAS Mini PC (Port 3000)"
add dst-address=10.100.100.10 protocol=tcp dst-port=80 action=accept comment="Akses Web Portal SIPAS Mini PC (Port 80)"
add dst-address=10.100.100.10 action=accept comment="Akses Penuh ke Server Mini PC"

# --- LANGKAH 9: NAT DNS Redirect & TCP RST untuk Pop-Up Otomatis ---
/ip firewall nat
add chain=dstnat in-interface=bridge-hotspot protocol=udp dst-port=53 action=redirect comment="DNS UDP Redirect"
add chain=dstnat in-interface=bridge-hotspot protocol=tcp dst-port=53 action=redirect comment="DNS TCP Redirect"

/ip firewall filter
add chain=hs-unauth protocol=tcp dst-port=443 action=reject reject-with=tcp-reset comment="Instant TCP RST for HTTPS Popup Trigger"

# --- LANGKAH 10: System Identity ---
/system identity
set name=SIPAS-Mikrotik-Local

:log info "Konfigurasi Mikrotik Local (ether2 IP 10.100.100.1/24) berhasil dipasang!"
