# =============================================================================
#     MIKROTIK SIPAS INTEGRATION SCRIPT (LOCAL MINI PC + CLOUDFLARE TUNNEL)
# =============================================================================
# Konfigurasi:
#   - Domain Captive Portal & Web Admin : https://sipas.npma.my.id/
#   - Mini PC Server (ether2)           : 10.100.100.10
#   - Gateway Hotspot Client            : 10.10.0.1 (atau 10.100.100.1)
#   - Port API Mikrotik                 : 8728
# =============================================================================

# --- LANGKAH 1: IP Service API port 8728 (Akses Web Admin Backend Mini PC) ---
/ip service
set api port=8728 address=0.0.0.0/0 disabled=no
set www disabled=no
set winbox disabled=no
set ssh disabled=no

# Buat User API khusus backend
/user group add name=sipas-api-group policy=api,read,write,test,policy comment="Group API SIPAS"
/user add name=sipas-api group=sipas-api-group password="PasswordSipas123!" comment="User API Backend SIPAS"

# --- LANGKAH 2: Hotspot User Profile ---
/ip hotspot user profile
set default idle-timeout=00:05:00 keepalive-timeout=00:02:00 shared-users=1

# --- LANGKAH 3: Hotspot Server Profile ---
/ip hotspot profile
add name=hsprof-captive hotspot-address=10.10.0.1 dns-name=hotspot.net login-by=http-chap,http-pap html-directory=hotspot http-cookie-lifetime=3d split-user-domain=no use-radius=no

# --- LANGKAH 4: Hotspot Server pada bridge-hotspot ---
/ip hotspot
add name=hotspot1 interface=bridge-hotspot address-pool=none profile=hsprof-captive idle-timeout=00:05:00 keepalive-timeout=00:02:00 disabled=no

# --- LANGKAH 5: BYPASS MINI PC SERVER (WAJIB) ---
/ip hotspot ip-binding
add address=10.100.100.10 type=bypassed comment="Mini PC SIPAS Server (Bypass Captive Portal)"

# --- LANGKAH 6: Walled Garden Akses Bebas ke Portal Cloudflare Domain ---
/ip hotspot walled-garden
add server=hotspot1 dst-host=sipas.npma.my.id comment="Portal SIPAS Cloudflare"
add server=hotspot1 dst-host=*.npma.my.id comment="Subdomain NPMA"
add server=hotspot1 dst-host=*.cloudflare.com comment="CDN Cloudflare"
add server=hotspot1 dst-host=sipas.local comment="Domain Lokal"
add server=hotspot1 dst-host=10.100.100.10 comment="IP Mini PC"

/ip hotspot walled-garden ip
add dst-address=10.100.100.10 protocol=tcp dst-port=3000 action=accept comment="Web Portal SIPAS Port 3000"
add dst-address=10.100.100.10 protocol=tcp dst-port=80 action=accept comment="Web Portal SIPAS Port 80"
add dst-address=10.100.100.10 action=accept comment="Bypass Traffic Mini PC"

# --- LANGKAH 7: Firewall Rules Dasar Hotspot & Keamanan Router ---
/ip firewall filter
add chain=input action=accept connection-state=established,related
add chain=forward action=accept connection-state=established,related
add chain=input action=drop connection-state=invalid
add chain=forward action=drop connection-state=invalid
add chain=input action=accept protocol=icmp
add chain=input action=accept in-interface=bridge-hotspot protocol=udp dst-port=53 comment="DNS UDP"
add chain=input action=accept in-interface=bridge-hotspot protocol=tcp dst-port=53 comment="DNS TCP"
add chain=input action=accept in-interface=bridge-hotspot protocol=udp dst-port=67 comment="DHCP Request"
add chain=input action=accept in-interface=bridge-hotspot protocol=tcp dst-port=8728 comment="Mikrotik API dari Mini PC"
add chain=input action=drop in-interface=ether1 comment="Drop WAN Input"

# --- LANGKAH 8: NAT DNS Redirect & Fast HTTPS RST untuk Pop-Up Otomatis ---
/ip firewall nat
add chain=dstnat in-interface=bridge-hotspot protocol=udp dst-port=53 action=redirect comment="DNS UDP Redirect"
add chain=dstnat in-interface=bridge-hotspot protocol=tcp dst-port=53 action=redirect comment="DNS TCP Redirect"

/ip firewall filter
add chain=hs-unauth protocol=tcp dst-port=443 action=reject reject-with=tcp-reset comment="Instant TCP RST for HTTPS to trigger automatic browser popup"

# --- LANGKAH 9: IP DNS Static ---
/ip dns static
add name=hotspot.net address=10.10.0.1 comment="Domain Gateway Hotspot"
add name=sipas.local address=10.100.100.10 comment="Domain Lokal Mini PC"

# --- LANGKAH 10: Backup Final ---
/system backup save name=hotspot-local-setup-backup
:log info "Konfigurasi Hotspot Local Mini PC + Cloudflare Tunnel berhasil dipasang!"
