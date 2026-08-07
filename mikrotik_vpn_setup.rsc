# =============================================================================
#       MIKROTIK L2TP/IPSEC VPN CLIENT SETUP SCRIPT
# =============================================================================
# Jalankan script ini di Mikrotik untuk menghubungkan router ke VPN Server VM.
# IP Public: 103.125.117.134
# =============================================================================

/interface l2tp-client add \
    name=l2tp-to-vps \
    connect-to=103.125.117.134 \
    user=vpnuser \
    password=MUZYY4mkJy95UMZS \
    use-ipsec=yes \
    ipsec-secret=ccgZ8zMcBSLdmMSNPY9y \
    profile=default-encryption \
    allow=mschap2 \
    disabled=no

/ip address print where interface=l2tp-to-vps

