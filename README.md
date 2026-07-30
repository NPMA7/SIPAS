# SIPAS — Sistem Integrasi Portal & Autentikasi Satu-Pintu 🌐🚀

**SIPAS** (*Sistem Integrasi Portal & Autentikasi Satu-Pintu*) adalah sistem manajemen terintegrasi untuk Mikrotik Hotspot dengan Captive Portal premium, manajemen bandwidth, dan pemblokiran situs lapis ganda secara real-time.

Aplikasi ini memadukan kemudahan pengelolaan database berbasis web modern (React & Node.js) dengan eksekusi aturan jaringan RouterOS secara presisi menggunakan koneksi API yang efisien dan andal.

---

## 🛠️ Tech Stack & Arsitektur

### 1. Backend (`/backend`)
* **Runtime**: Node.js
* **Framework**: Express.js
* **Database**: PostgreSQL (menyimpan data user, log autentikasi, & konfigurasi router)
* **Mikrotik API Connection**: `node-routeros` (dikonfigurasi dengan Connection Pooling untuk mencegah overhead koneksi TCP berulang kali)

### 2. Frontend (`/frontend`)
* **Framework**: React.js dengan Vite
* **Styling**: Vanilla CSS dengan desain Glassmorphism bertema gelap premium, modern, dan sepenuhnya responsif.
* **Fitur**: Grafik real-time dashboard, kelola user hotspot, live sessions monitoring, hapus lease DHCP, form konfigurasi router.

### 3. Captive Portal (`/flash/hotspot`)
* **Struktur**: HTML & JavaScript vanilla untuk kompatibilitas penuh dengan browser HP model lama/baru.
* **Login Mode**: HTTP-PAP (mengirim data login ke backend internal portal secara aman).

---

## 🛡️ Fitur Jaringan Utama

### 1. Pemblokiran Lapis Ganda Real-time (Dual-Layer Block)
Untuk memblokir situs-situs CDN modern seperti YouTube atau domain kustom (NPMA), sistem ini menerapkan penggabungan metode:
* **Lapis IP (Established Drop)**: IP target didaftarkan pada `/ip firewall address-list` Mikrotik untuk proses dynamic resolving otomatis. Aturan drop forward disetel di index teratas (`place-before=0`). Ini memutus **seluruh koneksi aktif (established)** seketika tanpa perlu memutus koneksi internet user.
* **Lapis L7 (New Connection Drop)**: Deteksi regex string di tab `/ip firewall layer7-protocol` untuk mencegah bypass koneksi baru via DNS pihak ketiga/Secure DNS.
* **QUIC Protocol Drop**: Memblokir lalu lintas port UDP 443 untuk mencegah bypass browser modern (Chrome/HTTP3).

### 2. Penanganan DHCP Lease Ghosting & Cleanup Otomatis
* Backend secara cerdas menyaring data sampah (lease kosong) pada menu DHCP Leases.
* Ketika status blokir untuk suatu situs dimatikan (uncheck) di web admin, sistem mendeteksi apakah masih ada user lain yang diblokir. Jika list kosong, backend otomatis menghapus **seluruh rule filter L7/IP/QUIC, address-list target, dan regex L7** dari router secara real-time agar konfigurasi Winbox tetap bersih.

### 4. Hybrid SSO & Dual Router Support
* **Hybrid SSO**: Terintegrasi langsung dengan API SSO Pemkab untuk pegawai ASN (autofill NIP, Nama, Jabatan, Golongan) serta mendukung pendaftaran manual User Lokal/Tamu.
* **Batas Perangkat (Max Devices)**: Mengunci jumlah perangkat aktif bersamaan per user (default: **4 perangkat**). Mengganti sesi lama jika reconnect dari perangkat yang sama dan menolak login perangkat ke-5.
* **Dual Router Support**: Mendukung Router Internal Diskominfo (Full Mikrotik API) dan Router Eksternal/Vendor (Portal Auth Bypass).
* **Multi-VLAN Subnet Kelas A**: Menyediakan pilihan script setup komplit Multi-VLAN Per-Dinas (`mikrotik_vlan_setup.rsc`) dengan subnet Kelas A (/16 = 65,534 IP per Dinas).

---

## 📂 Dokumentasi Lainnya

Untuk memulai deploy dan menggunakan sistem ini, silakan baca dokumentasi detail berikut:

1. 💻 **[Panduan Instalasi & Konfigurasi (SETUP.md)](./SETUP.md)**
2. 🔒 **[Panduan Setup VPS & VPN L2TP/IPsec (VPNSETUP.md)](./VPNSETUP.md)**
3. 📖 **[Panduan Penggunaan Fitur Web Admin (TUTORIAL.md)](./TUTORIAL.md)**
4. 🤝 **[Panduan Kolaborasi Tim Dev & Network (COLLABORATION.md)](./COLLABORATION.md)**
5. 📂 **[Panduan Struktur Folder & File (STRUCTURE.md)](./STRUCTURE.md)**
6. 🔄 **[Panduan Alur Logika Jaringan & Aplikasi (LOGIC_FLOW.md)](./LOGIC_FLOW.md)**
