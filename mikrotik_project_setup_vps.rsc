# =============================================================================
#     MIKROTIK WEBHOTSPOT INTEGRATION SCRIPT FOR VPS 
# =============================================================================
# Script ini sudah disesuaikan untuk deployment VPS dengan IP Public: 103.67.244.193
# dan Subnet VPN L2TP: 192.168.42.0/24
# =============================================================================

# --- LANGKAH 1: IP Service API port 8728 (Akses Web Admin Backend VPS) ---
/ip service
set api port=8728 address=0.0.0.0/0 disabled=no
set www disabled=no
set winbox disabled=no
set ssh disabled=no
set api-ssl disabled=yes
set telnet disabled=yes
set ftp disabled=yes

# --- LANGKAH 2: Hotspot User Profile ---
/ip hotspot user profile
set default idle-timeout=00:02:00 keepalive-timeout=00:02:00 shared-users=1

# --- LANGKAH 3: Hotspot Server Profile ---
/ip hotspot profile
add name=hsprof-captive hotspot-address=10.10.0.1 dns-name=hotspot.net login-by=http-chap,http-pap html-directory=hotspot http-cookie-lifetime=3d split-user-domain=no use-radius=no

# --- LANGKAH 4: Hotspot Server pada bridge-hotspot ---
/ip hotspot
add name=hotspot1 interface=bridge-hotspot address-pool=none profile=hsprof-captive idle-timeout=00:02:00 keepalive-timeout=00:02:00 disabled=no

# --- LANGKAH 5: Walled Garden Akses Bebas ke Portal VPS (Bypass Sebelum Login) ---
/ip hotspot walled-garden
add server=hotspot1 dst-host=103.67.244.193

/ip hotspot walled-garden ip
add server=hotspot1 dst-address=103.67.244.193

# --- LANGKAH 6: Firewall Rules Dasar Hotspot & Akses VPN Subnet ---
/ip firewall filter
add chain=input action=accept connection-state=established,related
add chain=forward action=accept connection-state=established,related
add chain=input action=drop connection-state=invalid
add chain=forward action=drop connection-state=invalid
add chain=input action=accept protocol=icmp
add chain=input action=accept src-address=192.168.88.0/24 comment="Akses LAN Admin Lokal (ether2)"
add chain=input action=accept src-address=192.168.42.0/24 comment="Akses VPN Server VPS"
add chain=input action=accept in-interface=bridge-hotspot protocol=udp dst-port=53
add chain=input action=accept in-interface=bridge-hotspot protocol=tcp dst-port=53
add chain=input action=accept in-interface=bridge-hotspot protocol=udp dst-port=67
add chain=input action=drop in-interface=ether1

# --- LANGKAH 6.1: NAT DNS Redirect & Fast HTTPS RST untuk Pop-Up Otomatis (LAN & Wi-Fi) ---
/ip firewall nat
add chain=dstnat in-interface=bridge-hotspot protocol=udp dst-port=53 action=redirect comment="Redirect client DNS (UDP 53) to local router for laptop captive portal detection"
add chain=dstnat in-interface=bridge-hotspot protocol=tcp dst-port=53 action=redirect comment="Redirect client DNS (TCP 53) to local router for laptop captive portal detection"

/ip firewall filter
add chain=hs-unauth protocol=tcp dst-port=443 action=reject reject-with=tcp-reset comment="Instant TCP RST for HTTPS to trigger automatic captive portal browser popup on LAN & Wi-Fi" place-before=0

# --- LANGKAH 6.2: IP DNS Static ---
/ip dns static
add name=hotspot.net address=10.10.0.1

# --- LANGKAH 7: Optional ---
# /ip firewall filter 
# add chain=forward protocol=udp dst-port=443 action=drop comment="Block QUIC UDP 443" place-before=0

# --- LANGKAH 8: Backup Final ---
/system backup save name=hotspot-vps-setup-backup
:log info "Konfigurasi Hotspot untuk VPS berhasil dipasang!"

