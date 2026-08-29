# =============================================================================
#     MIKROTIK SIPAS LOCAL SETUP - ROUTEROS v7 (RB951Ui-2nD / 5-PORT + WI-FI)
# =============================================================================
# Perangkat : Mikrotik RB951Ui-2nD (hAP) - RouterOS v7 (v7.23.2+)
# Spesifikasi: MIPS 650MHz, RAM 64MB, 5 Port Ethernet + Wi-Fi Internal (wlan1)
# Topologi:
#   - ether1 : Internet / ISP WAN (DHCP Client & Masquerade)
#   - ether2 : Dedicated Server Mini PC SIPAS (Segmen Isolasi: 10.100.100.0/24)
#              (Mikrotik Gateway: 10.100.100.1 | Mini PC: 10.100.100.10)
#   - ether3, ether4, ether5, wlan1 : Client Hotspot / Wi-Fi (Subnet: 10.10.0.0/16)
#                                     (Gateway Hotspot: 10.10.0.1)
# =============================================================================

# --- LANGKAH 1: Setup Wireless Wi-Fi Internal (wlan1) ---
/interface wireless
set [find default-name=wlan1] mode=ap-bridge ssid=SIPAS-WiFi band=2ghz-b/g/n channel-width=20/40mhz-XX distance=indoors frequency=auto wireless-protocol=802.11 disabled=no

# --- LANGKAH 2: Bridge Hotspot KHUSUS Client (ether3, ether4, ether5, wlan1) ---
/interface bridge
add name=bridge-hotspot comment="Bridge Hotspot Klien (ether3, ether4, ether5, wlan1)"

/interface bridge port
add bridge=bridge-hotspot interface=ether3 comment="LAN Client / External AP"
add bridge=bridge-hotspot interface=ether4 comment="LAN Client / External AP"
add bridge=bridge-hotspot interface=ether5 comment="LAN Client / External AP"
add bridge=bridge-hotspot interface=wlan1  comment="Wi-Fi Hotspot Internal"

# --- LANGKAH 3: IP Address Interface (Segmentasi Terpisah) ---
/ip address
# 3.1 IP Interface ether2 (Segmen Khusus Server Mini PC - Isolasi)
add address=10.100.100.1/24 interface=ether2 comment="Gateway Dedicated Server Mini PC (Isolasi)"

# 3.2 IP Interface Bridge Hotspot (Segmen Khusus Client/User)
add address=10.10.0.1/16 interface=bridge-hotspot comment="Gateway Hotspot Klien Kelas A"

# --- LANGKAH 4: WAN / Internet dari ISP (ether1) ---
/ip dhcp-client
add interface=ether1 disabled=no comment="Internet ISP"

/ip firewall nat
add chain=srcnat out-interface=ether1 action=masquerade comment="NAT Internet Masquerade"

# --- LANGKAH 5: DHCP Server untuk Client Hotspot (Subnet 10.10.0.0/16) ---
/ip pool
add name=pool-hotspot ranges=10.10.1.1-10.10.254.254 comment="Pool IP Hotspot (Kapasitas s/d 64.000 user)"

/ip dhcp-server
add name=dhcp-hotspot interface=bridge-hotspot address-pool=pool-hotspot lease-time=01:00:00 disabled=no

/ip dhcp-server network
add address=10.10.0.0/16 gateway=10.10.0.1 dns-server=10.10.0.1,8.8.8.8 netmask=16 comment="Subnet Hotspot Klien"

# --- LANGKAH 6: DNS Router & Static Host ---
/ip dns
set servers=8.8.8.8,1.1.1.1 allow-remote-requests=yes

/ip dns static
add name=hotspot.net address=10.10.0.1 comment="Domain Gateway Hotspot"
add name=sipas.local address=10.100.100.10 comment="Domain Mini PC Server SIPAS"

# --- LANGKAH 7: IP Service API untuk Backend Mini PC ---
/ip service
set api port=8728 address=0.0.0.0/0 disabled=no
set winbox disabled=no
set www disabled=no

# Buat User API khusus backend
/user group add name=sipas-api-group policy=api,read,write,test,policy comment="Group API SIPAS"
/user add name=sipas-api group=sipas-api-group password="PasswordSipas123!" comment="User API Backend SIPAS"

# --- LANGKAH 8: Hotspot Server Profile & Server (Hanya di bridge-hotspot) ---
/ip hotspot profile
add name=hsprof-sipas hotspot-address=10.10.0.1 dns-name=hotspot.net login-by=http-chap,http-pap html-directory=hotspot http-cookie-lifetime=3d split-user-domain=no use-radius=no

/ip hotspot
add name=hotspot1 interface=bridge-hotspot address-pool=none profile=hsprof-sipas idle-timeout=00:05:00 keepalive-timeout=00:02:00 disabled=no

/ip hotspot user profile
set [find default=yes] idle-timeout=00:05:00 keepalive-timeout=00:02:00 shared-users=4 on-logout=":local ip \$address; /ip firewall address-list remove [find address=\$ip and list~\"hotspot-blocked\"];"

# --- LANGKAH 9: WALLED GARDEN (IZIN AKSES KE SERVER & DOMAIN SEBELUM LOGIN) ---
/ip hotspot walled-garden
add server=hotspot1 dst-host=sipas.npma.my.id comment="Bypass Cloudflare Domain Portal"
add server=hotspot1 dst-host=*.npma.my.id comment="Bypass Subdomain NPMA"
add server=hotspot1 dst-host=*.cloudflare.com comment="Bypass Cloudflare CDN"
add server=hotspot1 dst-host=sipas.local comment="Bypass Domain Lokal"

/ip hotspot walled-garden ip
add dst-address=10.100.100.10 protocol=tcp dst-port=3000 action=accept comment="Akses Web Portal SIPAS Mini PC (Port 3000)"
add dst-address=10.100.100.10 protocol=tcp dst-port=80 action=accept comment="Akses Web Portal SIPAS Mini PC (Port 80)"
add dst-address=10.100.100.10 action=accept comment="Akses Penuh ke Server Mini PC"

# --- LANGKAH 10: NAT DNS Redirect & TCP RST untuk Pop-Up Otomatis ---
/ip firewall nat
add chain=dstnat in-interface=bridge-hotspot protocol=udp dst-port=53 action=redirect comment="DNS UDP Redirect"
add chain=dstnat in-interface=bridge-hotspot protocol=tcp dst-port=53 action=redirect comment="DNS TCP Redirect"

/ip firewall filter
add chain=hs-unauth protocol=tcp dst-port=443 action=reject reject-with=tcp-reset comment="Instant TCP RST for HTTPS Popup Trigger"

# --- LANGKAH 11: System Identity ---
/system identity
set name=SIPAS-Mikrotik-RB951

:log info "Konfigurasi Mikrotik RB951Ui-2nD RouterOS v7 (5-Port + Wi-Fi) berhasil dipasang!"
