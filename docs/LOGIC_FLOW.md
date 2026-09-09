# Alur Logika Jaringan & Aplikasi Dari Awal Sampai Akhir (Logic Flow) 🔄🧠

Dokumen ini menjelaskan **alur kerja (workflow) lengkap dari awal sampai akhir** bagaimana seluruh komponen sistem **SIPAS** (*Sistem Integrasi Portal & Autentikasi Satu-Pintu*) berinteraksi pada infrastruktur router **Mikrotik CCR2116-12G-4S+** — mulai dari perangkat client terhubung ke VLAN Wi-Fi Hotspot, autentikasi Hybrid SSO, komunikasi API ke Dedicated Mini PC Server SIPAS, hingga manajemen bandwidth dan pembersihan sesi otomatis.

---

## 🏛️ 1. Peta Arsitektur Sistem Terintegrasi

Sistem SIPAS terdiri dari komponen-komponen yang saling berkomunikasi secara lokal maupun cloud:

```text
[HP/Laptop Client] ──(VLAN 101 / VLAN 138)──► [Router Mikrotik CCR2116-12G-4S+]
                                                        │ (LAN-ether2: Port 8728 API / Walled Garden)
                                                        ▼
[Server API SSO Pemkab] ◄──(HTTPS API)── [Server Mini PC SIPAS (10.100.100.10)]
  (https://sso.xxx)                        ├── Nginx Reverse Proxy (Port 80/3000 / Cloudflare)
                                           ├── React Frontend Captive Portal (Vite)
                                           ├── Express.js Backend API (Port 3001)
                                           └── PostgreSQL Database (Port 5432)
```

---

## 🌐 2. ALUR 1: Autentikasi Captive Portal Client (End-to-End Login)

> **Analogi**: Seperti masuk gerbang tol otomatis. HP Anda diberikan nomor registrasi fisik (IP/MAC) dari DHCP VLAN. Saat ingin lewat, gerbang mengalihkan Anda ke loket otomatis (Portal SIPAS). Loket mengecek KTP/NIP Anda ke Pusat (Server SSO Pemkab), memeriksa kuota perangkat (Max 4 Devices), lalu membuka palang tol (Mikrotik Hotspot).

```text
[1. Koneksi Wi-Fi AP Hotspot (VLAN 101 "vlan-TIK" / VLAN 138 "vlan-KORPRI")]
  │
  ▼
[2. Mikrotik Berikan IP Dinamis via DHCP]
  │ (TIK: 10.87.1.10-254 / KORPRI: 10.87.38.10-254)
  ▼
[3. Client Buka Browser / Akses HTTP (Port 80)]
  │
  ▼ (HTTP 302 Redirect via redirect.html di Router)
[4. Browser Client Dialihkan ke Portal: https://sipas.npma.my.id/portal/login?ip=...&mac=...]
  │ (atau http://10.100.100.10:3000/portal/login?ip=...&mac=...)
  ▼
[5. Client Input NIP/Username & Password SSO]
  │
  ▼
[6. Frontend React POST ke Backend SIPAS (/api/portal/login)]
  │
  ├──► [User SSO] ──► POST Verifikasi ke Server API SSO Pemkab (https://sso.xxx/api/login)
  │                     │ (Status: True + Respon JSON: NIP, Nama, Jabatan, Golongan)
  │                     ▼
  │                   Auto-Provisioning / Update Data Pegawai di Database PostgreSQL
  │
  └──► [User Lokal] ─► Match Username & Password di PostgreSQL Lokal
  │
  ▼
[7. Backend Panggil Mikrotik API (10.100.100.1:8728 via LAN-ether2)]
  │  (Cek Active Sessions untuk NIP ini)
  │
  ├──► [MAC Sama (Reconnect)] ──► Tendang sesi usang dari MAC tersebut
  │
  ├──► [MAC Berbeda & Total Active Sessions >= Max Devices (>= 4)]
  │       │
  │       └──► Reject Error 409: "Batas Maksimal 4 Perangkat Active Reached!" ❌
  │
  └──► [Kuota Perangkat Tersedia (Active Sessions < 4)]
          │
          ▼
[8. Backend Buat User Temporer (temp-timestamp) & Simple Queue via API Port 8728]
  │
  ▼
[9. Backend Respon Sukses + Kredensial Temporer ke React Frontend]
  │
  ▼
[10. React Frontend Auto Hidden Form Submit ke Router (http://hotspot.net/login)]
  │  (atau http://10.87.1.1/login / http://10.87.38.1/login)
  ▼
[11. Mikrotik Verifikasi Tiket Temporer ➔ IP Client Di-Authorize ➔ Akses Internet Terbuka! 🌐]
```

---

## 👥 3. ALUR 2: Manajemen User, Bandwidth, & Sync Realtime (Admin Web)

Proses saat Administrator menambah, mengedit, atau mengubah limit bandwidth pengguna melalui Web Admin SIPAS (`https://sipas.npma.my.id/manage/admin`):

```text
[Admin Web UI (React Frontend)]
  │
  ▼ (1. Klik Simpan / Update User)
[Express.js Backend API]
  │
  ├──► (2. Update Record Data User) ──► [Database PostgreSQL]
  │
  ▼ (3. Cek Status Online User di Router)
[Router Mikrotik CCR2116 via API Port 8728]
  │
  ├──► [Status: User Sedang ONLINE Active]
  │       │
  │       └──► Update Simple Queue (Target IP) & Firewall Rules Detik Itu Juga ⚡
  │            (Limit Kecepatan Berubah Realtime Tanpa Diskonek!)
  │
  └──► [Status: User Sedang OFFLINE]
          │
          └──► Simpan di DB, Aturan Baru Otomatis Berlaku Saat User Login Nanti
```

### Rincian Eksekusi Realtime:
1. **Perubahan Kecepatan (Simple Queue)**: Jika admin mengubah limit bandwidth user dari `10M/10M` ke `50M/50M`, backend secara instan memperbarui target kecepatan queue di Mikrotik tanpa memutus koneksi internet user.
2. **Perubahan Batas Perangkat (Max Devices)**: Jika admin mengubah batas perangkat user dari `4` menjadi `2`, batas baru tersebut langsung berlaku pada login perangkat berikutnya.

---

## 🛡️ 4. ALUR 3: Pemblokiran Akses Situs Lapis Ganda Real-Time (NPMA & YouTube)

Sistem pemblokiran situs SIPAS menggunakan strategi **3-Lapis Perlindungan** untuk menangkal bypass DNS dan protokol modern:

```text
[Admin Centang Blokir Website pada User (misal: YouTube / NPMA)]
  │
  ▼
[IP Perangkat User Di-push ke Address-List Filter Mikrotik]
  │
  ├─► [LAPIS 1: Address-List Drop Forward (Koneksi Aktif / Established)]
  │     │
  │     └──► Aliran Data ke Web Tersebut Langsung Macet & Putus Seketika! 💥
  │
  ├─► [LAPIS 2: Layer 7 Protocol SNI Inspection (Koneksi Baru / Browser Refresh)]
  │     │
  │     └──► Paket TLS Client Hello Dibuang Sebelum Sempat Jabat Tangan (Handshake Drop)
  │
  └─► [LAPIS 3: UDP Port 443 Drop Rule (Bypass HTTP/3 QUIC Browser Chrome/Android)]
        │
        └──► Memaksa Browser Turun Kelas ke TCP, Memastikannya Terperangkap Lapis 1 & 2
  │
  ▼
[Browser HP/Laptop Client Menampilkan: "Connection Timed Out / Internet Terputus"]
```

---

## 📊 5. Ringkasan Parameter Utama Sistem

| Parameter Sistem | Nilai / Konfigurasi | Keterangan |
| :--- | :--- | :--- |
| **Model Router** | Mikrotik CCR2116-12G-4S+ | RouterOS v7 Core Engine |
| **Dedicated Server Mini PC** | `10.100.100.10` (Gateway `10.100.100.1`) | Terhubung ke `LAN-ether2` |
| **Domain Public Portal** | `https://sipas.npma.my.id` | Akses Portal & Web Admin |
| **Domain Lokal Server** | `sipas.local` (`10.100.100.10`) | Domain DNS Static Router |
| **VLAN 101 (TIK)** | `10.87.1.0/24` (Gateway: `10.87.1.1`) | Pool: `10.87.1.10 - 10.87.1.254` |
| **VLAN 138 (KORPRI)** | `10.87.38.0/24` (Gateway: `10.87.38.1`) | Pool: `10.87.38.10 - 10.87.38.254` |
| **Domain Gateway Hotspot** | `hotspot.net` | DNS Name Hotspot Profile |
| **Port API RouterOS** | `8728` (User: `sipas-api`) | Jalur Komunikasi Backend ke Mikrotik |
| **Batas Perangkat (Max)** | **4 Perangkat** / User | Mengunci maksimal 4 login bersamaan per NIP |
| **Timeout Idle & Keepalive** | `00:05:00` (Idle) / `00:02:00` (Keepalive)| Timeout Hotspot Profile Mikrotik ||
| **Opsi Topologi VLAN** | Multi-VLAN Per-Dinas | Script `mikrotik_vlan_setup.rsc` |
| **Batas Perangkat (Max)** | **4 Perangkat** / User | Mengunci maksimal 4 login bersamaan per NIP |
| **Mode Autentikasi SSO** | `SSO_MODE=real` | Terhubung langsung ke API SSO Pemkab |
| **Timeout Idle & Keepalive** | `00:02:00` (2 Menit) | Timeout bawaan Hotspot Mikrotik |
