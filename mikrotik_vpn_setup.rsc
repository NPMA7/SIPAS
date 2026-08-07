# =============================================================================
#       MIKROTIK L2TP/IPSEC VPN CLIENT SETUP SCRIPT
# =============================================================================
# Jalankan script ini di Mikrotik jika router berada di lokasi luar (remote).
# CATATAN PENTING: L2TP/IPsec VPN membutuhkan IP Public Langsung (103.125.117.134)
# dan BUKAN domain Cloudflare Tunnel (sipas.npma.my.id), karena Cloudflare Tunnel 
# khusus meneruskan lalu lintas Web HTTP/HTTPS, bukan protocol VPN UDP/IPsec.
# =============================================================================

/interface l2tp-client add \
    name=l2tp-to-vps \
    connect-to=103.125.117.134 \
    user=vpnuser1 \
    password=vpnuser1 \
    use-ipsec=yes \
    ipsec-secret=ATE7GEM3frnPqjhhDpMc \
    profile=default-encryption \
    allow=mschap2 \
    disabled=no

/ip address print where interface=l2tp-to-vps

