# Panduan Kolaborasi: Developer & Network Engineer 🤝🌐

Dokumen ini berfungsi sebagai jembatan komunikasi teknis antara **Software Developer** (pembuat aplikasi web admin & API) dan **Network Engineer** (pengelola infrastruktur router Mikrotik) agar proyek integrasi captive portal ini berjalan lancar.

---

## 💻 1. Perspektif Software Developer

### 🔑 Data yang Dibutuhkan Developer dari Network Engineer:

1. **Kredensial Akses API Mikrotik**:
   - IP management / IP VPN client router (contoh: `192.168.42.2`).
   - Port API RouterOS (default: `8728` atau `8729` untuk SSL).
   - Akun administrator khusus API dengan hak akses _read_ dan _write_.
2. **Topologi IP & Nama Interface**:
   - Nama interface / bridge tempat hotspot dijalankan (contoh: `bridge-hotspot`).
   - IP Address range subnet hotspot (contoh: `10.10.0.0/16` atau VLAN per-dinas).
3. **Format Limit Bandwidth (Simple Queue)**:
   - Penamaan Queue yang diinginkan agar tidak bentrok dengan setup jaringan kantor/sekolah lainnya.
4. **Target Domain Pemblokiran**:
   - Domain-domain spesifik beserta variannya yang ingin dimasukkan ke dalam fitur blokir web admin (contoh: YouTube, domain internal dinas, dsb).

### 🛠️ Apa yang Dilakukan Developer Terhadap Data Tersebut:

- **Konfigurasi Pool Koneksi API**: Developer memasukkan kredensial API Mikrotik ke tabel router di database PostgreSQL agar sistem Express.js dapat menginisiasi library `node-routeros`.
- **Parameterisasi Query API**: Developer menulis kode API untuk membuat, memperbarui, dan menghapus simple queue (`/queue/simple/add`) menggunakan variabel IP client dan bandwidth limit yang dikirim dari React frontend.
- **Otomatisasi Aturan Firewall**: Developer membuat loop dinamis di Node.js untuk mendaftarkan nama domain yang diblokir ke menu `/ip firewall address-list` dan memasang filter rule drop Lapis Ganda di Mikrotik secara real-time.

---

## 🌐 2. Perspektif Network Engineer

### 🔑 Data yang Dibutuhkan Network Engineer dari Developer:

1. **IP Address & Port Server Application**:
   - IP Public VPS host server tempat Docker backend dan database Postgres dijalankan (`103.67.244.193`).
   - Port HTTP Server Portal Admin (port `80` / `3000`).
2. **Kebutuhan Walled Garden**:
   - Domain dan alamat IP server backend (`103.67.244.193`) yang harus dilewati (bypass) sebelum pengguna melakukan login (agar browser client dapat memuat halaman captive portal).
3. **Pola Penandaan User (Comments)**:
   - Format tanda pengenal (comment) yang diberikan backend saat membuat user hotspot sementara (contoh format: `temp-<timestamp>` atau `Block npma for <username>`). Ini penting agar script scheduler Mikrotik dapat membedakan mana user statis dan mana user dinamis buatan web.

### 🛠️ Apa yang Dilakukan Network Engineer Terhadap Data Tersebut:

- **Routing & NAT Setup**: Network Engineer mengatur tabel routing agar port 8728 Mikrotik terbuka dan aman via jalur VPN L2TP (`192.168.42.0/24`).
- **Walled Garden Bypass**: Mengonfigurasi `/ip hotspot walled-garden ip` agar IP server VPS (`103.67.244.193`) di-bypass dari captive portal redirection.
- **Implementasi Scheduler & Autocleanup (`mikrotik_project_setup.rsc`)**:
  - Network Engineer memasang script dan scheduler yang memantau wireless registration-table.
  - Ketika client terputus sinyal, script akan membaca comment berawalan `temp-` yang dibuat developer, lalu menghapus active session hotspot, simple queue, dan lease DHCP yang bersangkutan dalam waktu 2 detik agar resource router tetap kosong dan bersih.

---

## 📋 3. Lembar Kerja Integrasi (Checklist Pertemuan)

Gunakan tabel ini untuk mencocokkan parameter sebelum melakukan deployment final:

| Parameter Integrasi            | Nilai / Konfigurasi                             | Pemilik Data     | Status    |
| :----------------------------- | :---------------------------------------------- | :--------------- | :-------- |
| **IP Management Mikrotik**     | IP VPN `192.168.42.X` (cth: `192.168.42.2`)     | Network Engineer | [ ] Cocok |
| **IP Public / Docker VPS**     | `103.67.244.193`                                | Developer        | [ ] Cocok |
| **Port API RouterOS**          | `8728`                                          | Network Engineer | [ ] Cocok |
| **Mode Topologi Jaringan**     | Non-VLAN (`10.10.0.0/16`) / Multi-VLAN Kelas A  | Network Engineer | [ ] Cocok |
| **Tipe Router SIPAS**          | Internal (Full API) / Eksternal (Vendor Portal) | Developer        | [ ] Cocok |
| **Batas Perangkat (Max)**      | Default `4` Perangkat / User                    | Developer        | [ ] Cocok |
| **SSID Wi-Fi Hotspot**         | `SIPAS-WiFi`                                    | Network Engineer | [ ] Cocok |
| **Format Queue Name**          | `hotspot-<username>`                            | Developer        | [ ] Cocok |
| **Target Walled Garden VPS**   | `103.67.244.193`                                | Network Engineer | [ ] Cocok |
