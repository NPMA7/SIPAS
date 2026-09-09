# Panduan Setup & Instalasi 💻⚙️

Dokumen ini menjelaskan alur instalasi dan deployment **SIPAS** (*Sistem Integrasi Portal & Autentikasi Satu-Pintu*) dari awal hingga sistem berjalan penuh pada router **Mikrotik CCR2116-12G-4S+** dan Server Dedicated Mini PC / Cloudflare.

---

## 📋 Ringkasan File Script Mikrotik

Proyek ini menyediakan berkas script konfigurasi RouterOS v7 siap pakai di folder `docs/`:

| File Script | Target Hardware / Fungsi | Kapan Digunakan? |
| :--- | :--- | :--- |
| **[mikrotik_ccr2116_vlan_setup.rsc](./mikrotik_ccr2116_vlan_setup.rsc)** | **CCR2116-12G-4S+**: Setup VLAN 101 (TIK) & VLAN 138 (KORPRI), Dedicated Server `10.100.100.10` di `LAN-ether2`, RouterOS API `8728`, Walled Garden, dan Fast TCP Reset. | **Utama / Produksi (Recommended)** |
| **[CONFIG_VENDOR_CCR.rsc](./CONFIG_VENDOR_CCR.rsc)** | Templat konfigurasi router eksternal / vendor untuk integrasi bypass portal. | **Opsi Router Vendor** |

---

## 🛠️ Langkah 1: Konfigurasi Router Mikrotik CCR2116

1. Buka **Winbox** dan hubungkan ke router Mikrotik CCR2116 Anda.
2. Buka menu **Files** di Winbox, lalu upload berkas:
   - `docs/mikrotik_ccr2116_vlan_setup.rsc`
3. Buka **New Terminal** di Winbox dan jalankan:
   ```routeros
   /import file-name=mikrotik_ccr2116_vlan_setup.rsc
   ```
4. Verifikasi di Winbox:
   - **IP -> Address**: Pastikan `10.100.100.1/24` terpasang di `LAN-ether2`, `10.87.1.1/24` di `vlan - TIK`, dan `10.87.38.1/24` di `vlan - KORPRI`.
   - **IP -> Hotspot**: Pastikan server `hs-tik` dan `hs-korpri` aktif dengan profile `hsprof-sipas`.
   - **IP -> Services**: Pastikan port `api` (`8728`) aktif.

---

## 📦 Langkah 2: Jalankan Application Server (Docker Compose)

Di komputer Server Dedicated Mini PC (yang terhubung ke port `LAN-ether2` Mikrotik):

1. Buka terminal di direktori root `/var/www/SIPAS`.
2. Pastikan file `.env` sudah terisi dengan benar (IP database, JWT secret, domain `sipas.npma.my.id`).
3. Jalankan perintah untuk mengaktifkan seluruh container:
   ```bash
   docker compose up -d --build
   ```
4. Pastikan seluruh container berstatus **Up (Running)**:
   ```bash
   docker compose ps
   ```

---

## 🌐 Langkah 3: Hubungkan Web Admin ke Router Mikrotik

1. Buka browser Anda dan akses halaman admin Web SIPAS di:
   - `https://sipas.npma.my.id/manage/admin/login`
2. Login sebagai Admin / SuperAdmin, lalu masuk ke menu **Routers / Router Setup** (`/manage/admin/routers`).
3. Daftarkan Router Mikrotik CCR2116 Anda:
   - **IP Address**: `10.100.100.1` (IP gateway router pada interface `LAN-ether2`)
   - **API Port**: `8728`
   - **Username**: `sipas-api`
   - **Password**: `PasswordSipas123!`
4. Klik **Test Koneksi** dan pastikan indikator status menunjukkan **Connected (Hijau)**.

---

## 🔑 Langkah 4: Upload Halaman Login Captive Portal (Hotspot Files)

1. Buka folder [flash/hotspot](../flash/hotspot).
2. Pastikan file `login.html` dan `rlogin.html` sudah mengarah ke `https://sipas.npma.my.id/`.
3. Upload seluruh isi folder `flash/hotspot` ke menu **Files** Winbox router Mikrotik Anda (folder `hotspot`).
4. Di Winbox, buka **IP -> Hotspot -> Server Profiles**:
   - Double-click `hsprof-sipas`, pastikan **HTML Directory** sudah terarah ke folder `hotspot`.
   - Pastikan **DNS Name** bernilai `hotspot.net`.
   - Klik **Apply** & **OK**.

---

## 🚀 Langkah 5: Pengujian Autentikasi Klien

1. Hubungkan HP/Laptop ke Wi-Fi Hotspot VLAN 101 (TIK) atau VLAN 138 (KORPRI).
2. Browser akan otomatis memunculkan pop-up Captive Portal SIPAS.
3. Masukkan NIP dan Password SSO Pegawai.
4. Setelah verifikasi berhasil, akses internet akan langsung terbuka dengan pembatasan bandwidth dan kebijakan firewall yang telah ditentukan.
