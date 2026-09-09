# Panduan Solusi Arsitektur & Deployment SIPAS Hotspot OPD 🏛️🌐

Dokumen ini berisi dokumentasi teknis lengkap mengenai konfigurasi **SIPAS Dedicated Mini PC / Cloudflare**, integrasi topologi **FTTH (`Mikrotik CCR2116 -> OLT -> ONT -> AP Ruijie`)**, konfigurasi perangkat lapangan, dan strategi skala pengguna.

---

## 📌 1. Ringkasan Parameter Router CCR2116 & Server SIPAS

* **Model Router**: Mikrotik CCR2116-12G-4S+ (16 Core ARM64, 16GB RAM)
* **Dedicated Mini PC Server**: `10.100.100.10` pada `LAN-ether2` (Gateway: `10.100.100.1/24`)
* **Domain Public Portal**: `https://sipas.npma.my.id/` (Port Nginx: `80` & `3000`)
* **Domain Lokal Server**: `sipas.local` (`10.100.100.10`)
* **Hotspot Gateway**: `hotspot.net` (`10.87.1.1` pada VLAN 101 / `10.87.38.1` pada VLAN 138)
* **Port API RouterOS Mikrotik**: `8728` (User: `sipas-api`)
* **File Script Konfigurasi Router**: [mikrotik_ccr2116_vlan_setup.rsc](./mikrotik_ccr2116_vlan_setup.rsc)

---

## 🛠️ 2. Solusi Redirect Captive Portal ke Domain SIPAS

### Masalah:
Klien HP/Laptop terarah ke IP lokal lama atau muncul error connection refused saat membuka browser.

### Penyebab:
File HTML captive portal bawaan di memori Winbox Mikrotik (`login.html` & `rlogin.html`) masih menyimpan alamat IP statis lama.

### Solusi:
Ubah variabel `portalUrl` pada berkas `login.html` dan `rlogin.html` di folder `flash/hotspot/` menjadi:
```javascript
var portalUrl = "https://sipas.npma.my.id/";
```
Lalu upload / replace seluruh folder `hotspot` tersebut ke menu **Files** Winbox Mikrotik CCR2116.

---

## 🌐 3. Integrasi Topologi FTTH Lapangan (`Mikrotik CCR2116 -> OLT -> ONT -> AP Ruijie`)

### Skenario Lapangan: ONT Berjalan PPPoE (`satpolpp_ketua`) + AP Ruijie SSO Hotspot

Agar PPPoE `satpolpp_ketua` untuk internet/remote ONT tidak terganggu, namun AP Ruijie di `LAN2` tetap memancarkan SSO Hotspot SIPAS:

#### A. Konfigurasi di ONT (Misal ZTE/Fiberhome `10.16.25.26`)
1. **Profil PPPoE Eksisting (`1_INTERNET_R_VID_1547`)**:
   * **TETAPKAN (Jangan diubah)** untuk internet/management ONT.
   * Binding: `LAN1` & `SSID1` internal ONT.
2. **Profil Tambahan Khusus Hotspot SSO (Klik `New`)**:
   * **Connection Name**: `2_HOTSPOT_B_VID_101` (atau `2_HOTSPOT_B_VID_138`)
   * **Type**: `Bridge`
   * **Service List**: `INTERNET`
   * **Binding Option**: Centang **`LAN2`** (Port tempat AP Ruijie dicolok)
   * **DHCP Server Enable**: **UNCHECK / DISABLE (Mati)**
   * **Enable NAT**: **UNCHECK / DISABLE (Mati)**
   * **VLAN Mode**: `TAG` (VLAN ID: `101` untuk TIK atau `138` untuk KORPRI)

#### B. Konfigurasi di AP Ruijie RAP2200(E)
1. **Working Mode**: Tetap di **`AP Mode`**.
2. **IP Management**: Biarkan DHCP (`192.168.1.28` hanya untuk lapor ke Ruijie Cloud).
3. **Wi-Fi List (SSID)**:
   * **Security**: Ubah dari `WPA2-PSK` menjadi **`Open` / `None` (Tanpa Password)**.
   * *Alasan*: Pengamanan & autentikasi akun pegawai sepenuhnya ditangani oleh SSO Captive Portal SIPAS (`https://sipas.npma.my.id/`).

---

## 📈 4. Strategi Skalabilitas & Manajemen VLAN

### A. Subnetting Per VLAN Hotspot
* **VLAN 101 (TIK)**: `10.87.1.0/24` (DHCP Pool: `10.87.1.10 – 10.87.1.254`, IP `.2-.9` dialokasikan untuk perangkat statis/AP).
* **VLAN 138 (KORPRI)**: `10.87.38.0/24` (DHCP Pool: `10.87.38.10 – 10.87.38.254`).

### B. DHCP Lease Time Singkat
Setel DHCP `lease-time` di Mikrotik menjadi **`01:00:00` (1 Jam)**. IP perangkat yang keluar jangkauan akan otomatis dirilis dan langsung dapat digunakan perangkat lain.

### C. Walled Garden Terbuka untuk Domain Esensial
Seluruh VLAN dari semua Access Point tetap bermuara ke **Web Portal SIPAS (`https://sipas.npma.my.id/`)**. Domain Cloudflare, SSO Pemkab, dan domain Ruijie Cloud Management (`*.ruijienetworks.com`, `*.djicdn.com`) otomatis di-bypass di Walled Garden Mikrotik CCR2116.
