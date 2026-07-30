# =============================================================================
#     MIKROTIK COMPLETE BASIC SETUP + VLAN PER DINAS (mikrotik_vlan_setup.rsc)
# =============================================================================
# Script ini 100% KOMPLIT mencakup konfigurasi dasar ISP, Bridge, NAT, DNS, 
# serta Multi-VLAN Tagging (802.1Q) Per Dinas dengan Subnet Kelas A (/16 = Max 65,534 Users)
#
# Digunakan sebagai Pengganti mikrotik_basic_setup.rsc jika menggunakan VLAN.
#
# Skema VLAN & IP Subnet Kelas A:
#  - VLAN 10 (Diskominfo) : 10.10.0.0/16 -> Gateway: 10.10.0.1
#  - VLAN 20 (Disdik)     : 10.20.0.0/16 -> Gateway: 10.20.0.1
#  - VLAN 30 (Dinkes)     : 10.30.0.0/16 -> Gateway: 10.30.0.1
#  - VLAN 40 (Bapenda)    : 10.40.0.0/16 -> Gateway: 10.40.0.1
# =============================================================================

# --- LANGKAH 1: Bridge LAN & Port Interface ---

/interface bridge
add name=bridge-hotspot comment="Bridge Hotspot Multi-VLAN"

/interface bridge port
add bridge=bridge-hotspot interface=ether2
add bridge=bridge-hotspot interface=ether3
add bridge=bridge-hotspot interface=wlan1

# --- LANGKAH 2: WLAN Interface (SSID Wi-Fi) ---

/interface wireless
set [find name=wlan1] mode=ap-bridge ssid=SIPAS-WiFi band=2ghz-onlyn channel-width=20/40mhz-eC distance=indoors frequency=auto wireless-protocol=802.11 disabled=no

# --- LANGKAH 3: DHCP Client (Akses Internet dari ISP) ---

/ip dhcp-client
add interface=ether1 disabled=no

# --- LANGKAH 4: Buat Interface VLAN pada Parent Bridge ---

/interface vlan
add name=vlan10-diskominfo vlan-id=10 interface=bridge-hotspot comment="VLAN 10 Diskominfo (Subnet Kelas A)"
add name=vlan20-disdik     vlan-id=20 interface=bridge-hotspot comment="VLAN 20 Dinas Pendidikan (Subnet Kelas A)"
add name=vlan30-dinkes     vlan-id=30 interface=bridge-hotspot comment="VLAN 30 Dinas Kesehatan (Subnet Kelas A)"
add name=vlan40-bapenda    vlan-id=40 interface=bridge-hotspot comment="VLAN 40 Bapenda (Subnet Kelas A)"

# --- LANGKAH 5: Konfigurasi IP Gateway per VLAN ---

/ip address
add address=10.10.0.1/16 interface=vlan10-diskominfo comment="Gateway VLAN 10 Diskominfo"
add address=10.20.0.1/16 interface=vlan20-disdik     comment="Gateway VLAN 20 Disdik"
add address=10.30.0.1/16 interface=vlan30-dinkes     comment="Gateway VLAN 30 Dinkes"
add address=10.40.0.1/16 interface=vlan40-bapenda    comment="Gateway VLAN 40 Bapenda"

# --- LANGKAH 6: IP Pool per VLAN (Subnet Kelas A /16) ---

/ip pool
add name=pool-vlan10 ranges=10.10.1.1-10.10.254.254 comment="Pool IP VLAN 10 (64,770 IP Address)"
add name=pool-vlan20 ranges=10.20.1.1-10.20.254.254 comment="Pool IP VLAN 20 (64,770 IP Address)"
add name=pool-vlan30 ranges=10.30.1.1-10.30.254.254 comment="Pool IP VLAN 30 (64,770 IP Address)"
add name=pool-vlan40 ranges=10.40.1.1-10.40.254.254 comment="Pool IP VLAN 40 (64,770 IP Address)"

# --- LANGKAH 7: DHCP Server & Network per VLAN ---

/ip dhcp-server
add name=dhcp-vlan10 interface=vlan10-diskominfo address-pool=pool-vlan10 lease-time=00:02:00 disabled=no
add name=dhcp-vlan20 interface=vlan20-disdik     address-pool=pool-vlan20 lease-time=00:02:00 disabled=no
add name=dhcp-vlan30 interface=vlan30-dinkes     address-pool=pool-vlan30 lease-time=00:02:00 disabled=no
add name=dhcp-vlan40 interface=vlan40-bapenda    address-pool=pool-vlan40 lease-time=00:02:00 disabled=no

/ip dhcp-server network
add address=10.10.0.0/16 gateway=10.10.0.1 dns-server=10.10.0.1 netmask=16 comment="Network VLAN 10 Diskominfo"
add address=10.20.0.0/16 gateway=10.20.0.1 dns-server=10.20.0.1 netmask=16 comment="Network VLAN 20 Disdik"
add address=10.30.0.0/16 gateway=10.30.0.1 dns-server=10.30.0.1 netmask=16 comment="Network VLAN 30 Dinkes"
add address=10.40.0.0/16 gateway=10.40.0.1 dns-server=10.40.0.1 netmask=16 comment="Network VLAN 40 Bapenda"

# --- LANGKAH 8: NAT Masquerade (Internet Sharing ke ISP) ---

/ip firewall nat
add chain=srcnat out-interface=ether1 action=masquerade comment="NAT Masquerade Internet ISP"

# --- LANGKAH 9: DNS Router ---

/ip dns
set servers=8.8.8.8,1.1.1.1 allow-remote-requests=yes

/ip dns static
add name=hotspot.net address=10.10.0.1 comment="Domain Portal SIPAS"

# --- LANGKAH 10: System Identity ---

/system identity
set name=SIPAS-Router

# --- LANGKAH 11: NTP Client (Sinkronisasi Waktu Router) ---

/system ntp client
set enabled=yes servers=216.239.35.0,216.239.35.4

:log info "Konfigurasi Basic Setup + Multi-VLAN Per-Dinas Subnet Kelas A KOMPLIT dipasang!"
