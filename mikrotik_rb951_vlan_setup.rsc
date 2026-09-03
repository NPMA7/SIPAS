# =============================================================================
#   MIKROTIK SIPAS LOCAL SETUP - ROUTEROS v7 (VLAN 101 TIK & VLAN 138 KORPRI)
# =============================================================================
# Perangkat : Mikrotik RB951Ui-2nD (hAP) - RouterOS v7 (v7.23.2+)
# Spesifikasi: MIPS 650MHz, RAM 64MB, 5 Port Ethernet (Wi-Fi Internal OFF)
# Topologi:
#   - ether1 : Internet / ISP WAN (DHCP Client & Masquerade)
#   - ether2 : Dedicated Server Mini PC SIPAS (Segmen Isolasi: 10.100.100.0/24)
#              (Mikrotik Gateway: 10.100.100.1 | Mini PC: 10.100.100.10)
#   - bridge-hotspot (Bridge VLAN Filtering):
#       * ether3 : Trunk Port (Tagged VLAN 101 & VLAN 138) -> Ke Ruijie AP / Switch Managed
#       * ether4 : Access Port VLAN 101 (Untagged PVID 101) -> LAN Klien TIK
#       * ether5 : Access Port VLAN 138 (Untagged PVID 138) -> LAN Klien KORPRI
#   - Wi-Fi Internal (wlan1): Dinonaktifkan (Disabled) - Full Menggunakan External AP / LAN
#   - Skema VLAN & Subnet:
#       * VLAN 101 (TIK)    : 10.87.1.0/24  -> Gateway: 10.87.1.1
#       * VLAN 138 (KORPRI) : 10.87.38.0/24 -> Gateway: 10.87.38.1
# =============================================================================

# --- LANGKAH 1: Nonaktifkan Wi-Fi Internal (Hemat Resource RAM & CPU) ---
/interface wireless
set [find default-name=wlan1] disabled=yes comment="Wi-Fi Internal Dinonaktifkan"

# --- LANGKAH 2: Bridge Hotspot & Port Assignment (VLAN Aware) ---
/interface bridge
add name=bridge-hotspot vlan-filtering=no comment="Bridge Hotspot Multi-VLAN"

/interface bridge port
add bridge=bridge-hotspot interface=ether3 comment="Trunk Port Tagged ke External AP (Ruijie/UniFi)"
add bridge=bridge-hotspot interface=ether4 pvid=101 comment="Access Port LAN Klien VLAN 101 (TIK)"
add bridge=bridge-hotspot interface=ether5 pvid=138 comment="Access Port LAN Klien VLAN 138 (KORPRI)"

# --- LANGKAH 3: Interface VLAN pada Bridge ---
/interface vlan
add name=vlan101-tik    vlan-id=101 interface=bridge-hotspot comment="VLAN 101 TIK (10.87.1.0/24)"
add name=vlan138-korpri vlan-id=138 interface=bridge-hotspot comment="VLAN 138 KORPRI (10.87.38.0/24)"

# --- LANGKAH 4: Bridge VLAN Filtering Table ---
/interface bridge vlan
add bridge=bridge-hotspot vlan-ids=101 tagged=bridge-hotspot,ether3 untagged=ether4 comment="VLAN 101 TIK: Trunk ether3 + Access ether4"
add bridge=bridge-hotspot vlan-ids=138 tagged=bridge-hotspot,ether3 untagged=ether5 comment="VLAN 138 KORPRI: Trunk ether3 + Access ether5"

# Aktifkan VLAN Filtering pada Bridge
/interface bridge
set [find name=bridge-hotspot] vlan-filtering=yes

# --- LANGKAH 5: IP Address Interface (Segmentasi Server & VLAN) ---
/ip address
# 5.1 IP Interface ether2 (Segmen Khusus Server Mini PC - Isolasi)
add address=10.100.100.1/24 interface=ether2 comment="Gateway Dedicated Server Mini PC (Isolasi)"

# 5.2 IP Interface VLAN 101 (TIK) & VLAN 138 (KORPRI)
add address=10.87.1.1/24 interface=vlan101-tik comment="Gateway Hotspot VLAN 101 TIK"
add address=10.87.38.1/24 interface=vlan138-korpri comment="Gateway Hotspot VLAN 138 KORPRI"

# --- LANGKAH 6: WAN / Internet dari ISP (ether1) ---
/ip dhcp-client
add interface=ether1 disabled=no comment="Internet ISP"

/ip firewall nat
add chain=srcnat out-interface=ether1 action=masquerade comment="NAT Internet Masquerade"

# --- LANGKAH 7: DHCP Pool & Server per-VLAN ---
/ip pool
add name=pool-vlan101 ranges=10.87.1.10-10.87.1.254 comment="Pool IP VLAN 101 TIK (.2-.9 Static/AP)"
add name=pool-vlan138 ranges=10.87.38.10-10.87.38.254 comment="Pool IP VLAN 138 KORPRI (.2-.9 Static/AP)"

/ip dhcp-server
add name=dhcp-vlan101 interface=vlan101-tik address-pool=pool-vlan101 lease-time=01:00:00 disabled=no
add name=dhcp-vlan138 interface=vlan138-korpri address-pool=pool-vlan138 lease-time=01:00:00 disabled=no

/ip dhcp-server network
add address=10.87.1.0/24 gateway=10.87.1.1 dns-server=10.87.1.1,8.8.8.8 netmask=24 comment="Subnet Hotspot VLAN 101 TIK"
add address=10.87.38.0/24 gateway=10.87.38.1 dns-server=10.87.38.1,8.8.8.8 netmask=24 comment="Subnet Hotspot VLAN 138 KORPRI"

# --- LANGKAH 8: DNS Router & Static Host ---
/ip dns
set servers=8.8.8.8,1.1.1.1 allow-remote-requests=yes

/ip dns static
add name=hotspot.net address=10.87.1.1 comment="Domain Gateway Hotspot (VLAN 101)"
add name=hotspot.net address=10.87.38.1 comment="Domain Gateway Hotspot (VLAN 138)"
add name=sipas.local address=10.100.100.10 comment="Domain Mini PC Server SIPAS"

# --- LANGKAH 9: IP Service API untuk Backend Mini PC ---
/ip service
set api port=8728 address=0.0.0.0/0 disabled=no
set winbox disabled=no
set www disabled=no

# Buat User API khusus backend
/user group add name=sipas-api-group policy=api,read,write,test,policy comment="Group API SIPAS"
/user add name=sipas-api group=sipas-api-group password="PasswordSipas123!" comment="User API Backend SIPAS"

# --- LANGKAH 10: Hotspot Server Profile & Server per-VLAN ---
/ip hotspot profile
add name=hsprof-sipas hotspot-address=0.0.0.0 dns-name=hotspot.net login-by=http-chap,http-pap html-directory=hotspot http-cookie-lifetime=3d split-user-domain=no use-radius=no

/ip hotspot
add name=hs-vlan101 interface=vlan101-tik address-pool=none profile=hsprof-sipas idle-timeout=00:05:00 keepalive-timeout=00:02:00 disabled=no
add name=hs-vlan138 interface=vlan138-korpri address-pool=none profile=hsprof-sipas idle-timeout=00:05:00 keepalive-timeout=00:02:00 disabled=no

/ip hotspot user profile
set [find default=yes] idle-timeout=00:05:00 keepalive-timeout=00:02:00 shared-users=4

# Bypass IP Server Mini PC dari Hotspot
/ip hotspot ip-binding
add address=10.100.100.10 type=bypassed comment="Mini PC SIPAS Server - Bypass Hotspot"
# Optional: Bypass AP Ruijie (Ganti IP / MAC sesuai perangkat AP Anda)
# add address=10.87.1.2 type=bypassed comment="Ruijie AP Management - Bypass Hotspot"

# --- LANGKAH 11: WALLED GARDEN (AKSES KE SERVER & DOMAIN SEBELUM LOGIN) ---
/ip hotspot walled-garden
add dst-host=sipas.npma.my.id comment="Bypass Cloudflare Domain Portal"
add dst-host=*.npma.my.id comment="Bypass Subdomain NPMA"
add dst-host=*.cloudflare.com comment="Bypass Cloudflare CDN"
add dst-host=sipas.local comment="Bypass Domain Lokal"
add dst-host=*.ruijienetworks.com comment="Bypass Ruijie Cloud Management"
add dst-host=*.djicdn.com comment="Bypass Ruijie CDN"

/ip hotspot walled-garden ip
add dst-address=10.100.100.10 protocol=tcp dst-port=3000 action=accept comment="Akses Web Portal SIPAS Mini PC (Port 3000)"
add dst-address=10.100.100.10 protocol=tcp dst-port=80 action=accept comment="Akses Web Portal SIPAS Mini PC (Port 80)"
add dst-address=10.100.100.10 action=accept comment="Akses Penuh ke Server Mini PC"

# --- LANGKAH 12: NAT DNS Redirect & TCP RST untuk Pop-Up Otomatis ---
/ip firewall nat
add chain=dstnat in-interface=vlan101-tik protocol=udp dst-port=53 action=redirect comment="DNS UDP Redirect VLAN 101"
add chain=dstnat in-interface=vlan101-tik protocol=tcp dst-port=53 action=redirect comment="DNS TCP Redirect VLAN 101"
add chain=dstnat in-interface=vlan138-korpri protocol=udp dst-port=53 action=redirect comment="DNS UDP Redirect VLAN 138"
add chain=dstnat in-interface=vlan138-korpri protocol=tcp dst-port=53 action=redirect comment="DNS TCP Redirect VLAN 138"

/ip firewall filter
add chain=hs-unauth protocol=tcp dst-port=443 action=reject reject-with=tcp-reset comment="Instant TCP RST for HTTPS Popup Trigger"

# --- LANGKAH 13: System Identity ---
/system identity
set name=SIPAS-Mikrotik-RB951-VLAN

:log info "Konfigurasi Mikrotik RB951Ui-2nD (VLAN 101 TIK & VLAN 138 KORPRI) RouterOS v7 berhasil dipasang!"
