# =============================================================================
#           MIKROTIK BASIC NETWORK SETUP SCRIPT (mikrotik_basic_setup.rsc)
# =============================================================================
# Bagian ini berisi konfigurasi murni jaringan dasar Mikrotik agar router
# mendapatkan akses internet dari ISP dan membagikan IP address ke client lokal.
# =============================================================================

# --- LANGKAH 1: Bridge LAN & Hotspot ---

/interface bridge
add name=bridge-hotspot comment="Bridge Hotspot"

/interface bridge port
add bridge=bridge-hotspot interface=ether3
add bridge=bridge-hotspot interface=wlan1

# --- LANGKAH 2: WLAN Interface (SSID) ---

/interface wireless
set [find name=wlan1] mode=ap-bridge ssid=SIPAS-WiFi band=2ghz-onlyn channel-width=20/40mhz-eC distance=indoors frequency=auto wireless-protocol=802.11 disabled=no

# --- LANGKAH 3: IP Address Interface ---

/ip address
add address=192.168.88.1/24 interface=ether2 comment="Akses LAN Admin Lokal"

/ip address
add address=10.10.0.1/16 interface=bridge-hotspot comment="IP Gateway Hotspot Kelas A (Max 65,534 Users)"

# --- LANGKAH 4: DHCP Client (Internet dari ISP) ---

/ip dhcp-client
add interface=ether1 disabled=no

# --- LANGKAH 5: IP Pool dan DHCP Server (Distribusi IP LAN / Hotspot) ---

/ip pool
add name=pool-hotspot ranges=10.10.1.1-10.10.254.254 comment="Pool IP Kelas A (64,770 IP Address)"

/ip dhcp-server
add name=dhcp-hotspot interface=bridge-hotspot address-pool=pool-hotspot lease-time=00:02:00 disabled=no

/ip dhcp-server network
add address=10.10.0.0/16 gateway=10.10.0.1 dns-server=10.10.0.1 netmask=16 comment="Subnet Jaringan Kelas A"

# --- LANGKAH 6: NAT Masquerade (Internet Sharing) & DNS Redirect ---

/ip firewall nat
add chain=srcnat out-interface=ether1 action=masquerade

# --- LANGKAH 7: DNS Router ---

/ip dns
set servers=8.8.8.8,1.1.1.1 allow-remote-requests=yes

/ip dns static
add name=hotspot.net address=10.10.0.1 comment="Domain Portal SIPAS"

# --- LANGKAH 8: System Identity ---

/system identity
set name=HotSpot-Router

# --- LANGKAH 9: NTP Client (Sinkronisasi Waktu) ---

/system ntp client
set enabled=yes servers=216.239.35.0,216.239.35.4
