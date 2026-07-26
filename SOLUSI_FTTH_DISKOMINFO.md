# Panduan Solusi Arsitektur & Deployment SIPAS Hotspot Diskominfo Kab. Bandung 🏛️🌐

Dokumen ini berisi dokumentasi teknis lengkap mengenai konfigurasi **SIPAS VPS**, integrasi topologi **FTTH (`Mikrotik -> OLT -> ONT -> AP Ruijie`)**, konfigurasi perangkat lapangan, dan strategi skala **6.000 Pegawai OPD**.

---

## 📌 1. Ringkasan Parameter VPS & Jaringan Production

* **IP Public VPS SIPAS**: `103.67.244.193` (Port Web Admin & Portal: `3000`)
* **IP Tunnel L2TP VPN Server**: `192.168.42.1`
* **IP Tunnel L2TP VPN Mikrotik**: `192.168.42.10`
* **Subnet VPN**: `192.168.42.0/24`
* **Port API RouterOS Mikrotik**: `8728`
* **File Script Production Mikrotik**: [mikrotik_project_setup_vps.rsc](./mikrotik_project_setup_vps.rsc)

---

## 🛠️ 2. Solusi Redirect Captive Portal ke VPS Public IP

### Masalah:
Klien HP/Laptop terarah ke IP lokal `http://192.168.88.2:3000/` dan error connection refused.

### Penyebab:
File HTML captive portal bawaan di memori Winbox Mikrotik (`login.html` & `rlogin.html`) masih menyimpan alamat IP lokal lama.

### Solusi:
Ubah variabel `portalUrl` pada berkas `login.html` dan `rlogin.html` di folder `flash/hotspot/` menjadi:
```javascript
var portalUrl = "http://103.67.244.193:3000/";
```
Lalu upload / replace seluruh folder `hotspot` tersebut ke menu **Files** Winbox Mikrotik.

---

## 🌐 3. Integrasi Topologi FTTH Lapangan (`Mikrotik -> OLT -> ONT -> AP Ruijie`)

### Skenario Lapangan: ONT Berjalan PPPoE (`satpolpp_ketua`) + AP Ruijie SSO Hotspot

Agar PPPoE `satpolpp_ketua` untuk internet/remote ONT tidak terganggu, namun AP Ruijie di `LAN2` tetap memancarkan SSO Hotspot VPS:

#### A. Konfigurasi di ONT (Misal ZTE/Fiberhome `10.16.25.26`)
1. **Profil PPPoE Eksisting (`1_INTERNET_R_VID_1547`)**:
   * **TETAPKAN (Jangan diubah)** untuk internet/management ONT.
   * Binding: `LAN1` & `SSID1` internal ONT.
2. **Profil Tambahan Khusus Hotspot SSO (Klik `New`)**:
   * **Connection Name**: `2_HOTSPOT_B_VID_2000`
   * **Type**: `Bridge`
   * **Service List**: `INTERNET`
   * **Binding Option**: Centang **`LAN2`** (Port tempat AP Ruijie dicolok)
   * **DHCP Server Enable**: **UNCHECK / DISABLE (Mati)**
   * **Enable NAT**: **UNCHECK / DISABLE (Mati)**
   * **VLAN Mode**: `TAG` (VLAN ID: `2000` atau samakan dengan VLAN Hotspot Mikrotik)

#### B. Konfigurasi di AP Ruijie RAP2200(E)
1. **Working Mode**: Tetap di **`AP Mode`**.
2. **IP Management**: Biarkan DHCP (`192.168.1.28` hanya untuk lapor ke Ruijie Cloud).
3. **Wi-Fi List (SSID)**:
   * **Security**: Ubah dari `WPA2-PSK` menjadi **`Open` / `None` (Tanpa Password)**.
   * *Alasan*: Pengamanan & autentikasi akun pegawai sepenuhnya ditangani oleh SSO Captive Portal VPS (`103.67.244.193:3000`).

---

## 📈 4. Strategi Skalabilitas 6.000 Pegawai OPD Pemkab Bandung

### A. Perluasan Subnet IP Address (Subnetting)
Ubah subnet IP pool Hotspot di Mikrotik dari `/24` menjadi Klas A:
* **Subnet**: `10.100.0.0/18` (Menyediakan **16.382 IP Address**)
* **IP Pool**: `10.100.0.2` – `10.100.63.254`

### B. DHCP Lease Time Singkat
Setel DHCP `lease-time` di Mikrotik menjadi **`01:00:00` (1 Jam)**. IP pegawai yang keluar kantor akan otomatis dirilis dan langsung bisa digunakan pegawai lain.

### C. Pembagian VLAN Per-OPD (Anti-Broadcast Storm)
Bagi subnet per-kantor OPD menggunakan VLAN:
* **Satpol PP**: VLAN 10 (`10.100.10.0/24`)
* **Dinkes**: VLAN 20 (`10.100.20.0/23`)
* **Disdik**: VLAN 30 (`10.100.30.0/22`)
* **Setda & Diskominfo**: VLAN 40 (`10.100.40.0/23`)

 Seluruh VLAN dari semua kantor OPD tersebut tetap bermuara ke **1 Web Server VPS (`http://103.67.244.193:3000/`)** yang sama. Pegawai dapat login menggunakan NIP & Password masing-masing di kantor OPD manapun.
