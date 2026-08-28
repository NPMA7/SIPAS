# =============================================================================
#     MIKROTIK SIPAS LOCAL SETUP SCRIPT (MINI PC SERVER DI ETHER2)
# =============================================================================
# Topologi:
#   - ether1 : Internet / ISP WAN (DHCP Client)
#   - ether2 : Mini PC Server SIPAS (IP: 10.100.254.190:3000)
#   - ether3-ether5 / wlan1 : Client Hotspot / AP Ruijie / Switch
# =============================================================================

# --- LANGKAH 1: Bridge Hotspot & Penambahan Port ---
/interface bridge
add name=bridge-hotspot comment="Bridge Hotspot & Server SIPAS"

/interface bridge port
add bridge=bridge-hotspot interface=ether2 comment="Dedicated Kabel ke Mini PC SIPAS"
add bridge=bridge-hotspot interface=ether3 comment="Access Point / Client"
add bridge=bridge-hotspot interface=ether4 comment="Access Point / Client"
add bridge=bridge-hotspot interface=ether5 comment="Access Point / Client"

# --- LANGKAH 2: IP Address Gateway Router ---
/ip address
add address=10.100.0.1/16 interface=bridge-hotspot comment="IP Gateway Hotspot & Server (Subnet Kelas A)"

# --- LANGKAH 3: WAN / Internet dari ISP ---
/ip dhcp-client
add interface=ether1 disabled=no comment="Internet ISP"

/ip firewall nat
add chain=srcnat out-interface=ether1 action=masquerade comment="NAT Internet Masquerade"

# --- LANGKAH 4: DHCP Server untuk Client Hotspot ---
/ip pool
add name=pool-hotspot ranges=10.100.1.1-10.100.253.254 comment="Pool IP Hotspot (Kapasitas s/d 64.000 user)"

/ip dhcp-server
add name=dhcp-hotspot interface=bridge-hotspot address-pool=pool-hotspot lease-time=01:00:00 disabled=no

/ip dhcp-server network
add address=10.100.0.0/16 gateway=10.100.0.1 dns-server=10.100.0.1,8.8.8.8 netmask=16 comment="Subnet Hotspot"

# --- LANGKAH 5: DNS Router & Static Host ---
/ip dns
set servers=8.8.8.8,1.1.1.1 allow-remote-requests=yes

/ip dns static
add name=hotspot.net address=10.100.0.1 comment="Domain Gateway Hotspot"
add name=sipas.local address=10.100.254.190 comment="Domain Mini PC Server SIPAS"

# --- LANGKAH 6: IP Service API untuk Backend Mini PC ---
/ip service
set api port=8728 address=0.0.0.0/0 disabled=no
set winbox disabled=no
set www disabled=no

# --- LANGKAH 7: Hotspot Server Profile & Server ---
/ip hotspot profile
add name=hsprof-sipas hotspot-address=10.100.0.1 dns-name=hotspot.net login-by=http-chap,http-pap html-directory=hotspot http-cookie-lifetime=3d split-user-domain=no use-radius=no

/ip hotspot
add name=hotspot1 interface=bridge-hotspot address-pool=none profile=hsprof-sipas idle-timeout=00:05:00 keepalive-timeout=00:02:00 disabled=no

/ip hotspot user profile
set default idle-timeout=00:05:00 keepalive-timeout=00:02:00 shared-users=1

# --- LANGKAH 8: BYPASS MINI PC & WALLED GARDEN (SANGAT PENTING) ---
# 8.1 Bypass Mini PC agar koneksi server bebas akses tanpa login captive portal
/ip hotspot ip-binding
add address=10.100.254.190 type=bypassed comment="Mini PC SIPAS Server (Bypass Captive Portal)"

# 8.2 Walled Garden agar HP/Laptop klien sebelum login bisa membuka Web Portal SIPAS
/ip hotspot walled-garden
add server=hotspot1 dst-host=sipas.npma.my.id comment="Bypass Cloudflare Domain Portal"
add server=hotspot1 dst-host=*.npma.my.id comment="Bypass Subdomain NPMA"
add server=hotspot1 dst-host=*.cloudflare.com comment="Bypass Cloudflare CDN"
add server=hotspot1 dst-host=sipas.local comment="Bypass Domain Lokal"
add server=hotspot1 dst-host=10.100.254.190 comment="Bypass IP Lokal Mini PC"

/ip hotspot walled-garden ip
add dst-address=10.100.254.190 dst-port=3000 action=accept comment="Bypass Web Portal SIPAS Port 3000"
add dst-address=10.100.254.190 dst-port=80 action=accept comment="Bypass Web Portal SIPAS Port 80"
add dst-address=10.100.254.190 action=accept comment="Bypass Seluruh Traffic ke Mini PC"

# --- LANGKAH 9: NAT DNS Redirect & TCP RST untuk Pop-Up Otomatis ---
/ip firewall nat
add chain=dstnat in-interface=bridge-hotspot protocol=udp dst-port=53 action=redirect comment="DNS UDP Redirect"
add chain=dstnat in-interface=bridge-hotspot protocol=tcp dst-port=53 action=redirect comment="DNS TCP Redirect"

/ip firewall filter
add chain=hs-unauth protocol=tcp dst-port=443 action=reject reject-with=tcp-reset comment="TCP RST for HTTPS Popup Trigger" place-before=0

# --- LANGKAH 10: System Identity ---
/system identity
set name=SIPAS-Mikrotik-Local

:log info "Konfigurasi Mikrotik Local On-Premises Mini PC berhasil dipasang!"
