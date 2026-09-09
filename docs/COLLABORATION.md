# Panduan Kolaborasi: Developer & Network Engineer 🤝🌐

Dokumen ini berfungsi sebagai jembatan komunikasi teknis antara **Software Developer** (pembuat aplikasi web admin & REST API) dan **Network Engineer** (pengelola infrastruktur router Mikrotik CCR2116-12G-4S+) agar sistem **SIPAS** (*Sistem Integrasi Portal & Autentikasi Satu-Pintu*) berjalan terintegrasi dan aman.

---

## 💻 1. Perspektif Software Developer

### 🔑 Data yang Dibutuhkan Developer dari Network Engineer:

1. **Kredensial Akses API Mikrotik (RouterOS v7)**:
   - IP gateway server pada interface `LAN-ether2` (contoh: `10.100.100.1`).
   - Port API RouterOS (`8728`).
   - Akun API khusus: `sipas-api` dengan group `sipas-api-group` (policy: `api,read,write,test,policy`).
2. **Topologi IP & Nama Interface Hotspot**:
   - Interface Dedicated Server: `LAN-ether2` (Subnet `10.100.100.0/24`, Server IP `10.100.100.10`).
   - Interface Hotspot VLAN 101 TIK: `vlan-TIK` (Subnet `10.87.1.0/24`, Gateway `10.87.1.1`, Pool `10.87.1.10-10.87.1.254`).
   - Interface Hotspot VLAN 138 KORPRI: `vlan-KORPRI` (Subnet `10.87.38.0/24`, Gateway `10.87.38.1`, Pool `10.87.38.10-10.87.38.254`).
   - Domain Gateway Hotspot: `hotspot.net`.
3. **Format Limit Bandwidth (Simple Queue)**:
   - Penamaan Queue format: `hotspot-<username>` agar terisolasi dan mudah dimonitor.
4. **Target Domain Pemblokiran & Walled Garden**:
   - Domain yang dibypass: `sipas.npma.my.id`, `*.npma.my.id`, `*.cloudflare.com`, `sipas.local`, `*.ruijienetworks.com`, `*.djicdn.com`.
   - Domain target pemblokiran web admin (YouTube, situs terlarang, dll).

### 🛠️ Apa yang Dilakukan Developer Terhadap Data Tersebut:

- **Konfigurasi Pool Koneksi API**: Developer memasukkan kredensial API Mikrotik (`10.100.100.1:8728`, user `sipas-api`) ke database PostgreSQL agar backend Node.js (`node-routeros`) dapat mengelola sesi hotspot real-time.
- **Parameterisasi Simple Queue**: Developer mengotomatisasi pembuatan, update, dan penghapusan bandwidth queue (`/queue/simple`) saat user login/logout atau saat admin mengubah limit kecepatan di web UI.
- **Otomatisasi Firewall Lapis Ganda**: Backend secara dinamis menambahkan IP target ke `/ip firewall address-list` dan menerapkan filter drop koneksi instan.

---

## 🌐 2. Perspektif Network Engineer

### 🔑 Data yang Dibutuhkan Network Engineer dari Developer:

1. **IP Address & Port Server Application**:
   - Alamat Dedicated Server Mini PC: `10.100.100.10` pada `LAN-ether2`.
   - Domain Public Portal: `sipas.npma.my.id` (via Cloudflare).
   - Domain Lokal Server: `sipas.local` (`10.100.100.10`).
   - Port HTTP Server Nginx: Port `80` & `3000`.
   - Port Backend API: Port `3001`.
2. **Kebutuhan Walled Garden & Bypass**:
   - IP Binding bypass untuk Mini PC Server: `10.100.100.10` (type `bypassed`).
   - Walled Garden IP: `10.100.100.10` (Port `80`, `3000`).
   - Walled Garden Host: `sipas.npma.my.id`, `*.npma.my.id`, `*.cloudflare.com`, `sipas.local`.
3. **Konfigurasi Hotspot Profile**:
   - Profile: `hsprof-sipas` (DNS Name: `hotspot.net`, Login by: `http-chap,http-pap`, HTML Directory: `hotspot`).

### 🛠️ Apa yang Dilakukan Network Engineer Terhadap Data Tersebut:

- **Eksekusi Script Setup**: Mengimpor berkas [mikrotik_ccr2116_vlan_setup.rsc](./mikrotik_ccr2116_vlan_setup.rsc) pada router Mikrotik CCR2116-12G-4S+.
- **Pemasangan File Hotspot**: Mengunggah isi folder `flash/hotspot` ke router dan memastikan file `login.html` & `rlogin.html` mengarah ke `https://sipas.npma.my.id/`.
- **Fast TCP Reset & DNS Redirect**: Menerapkan rule NAT port 53 dan filter drop port 443 TCP reset untuk memicu auto popup captive portal di smartphone Android/iOS secara instan.

---

## 📋 3. Lembar Kerja Integrasi (Checklist Pertemuan)

Gunakan tabel ini untuk mencocokkan parameter sebelum deployment:

| Parameter Integrasi            | Nilai / Konfigurasi                             | Pemilik Data     | Status    |
| :----------------------------- | :---------------------------------------------- | :--------------- | :-------- |
| **Model Router**               | Mikrotik CCR2116-12G-4S+ (RouterOS v7)          | Network Engineer | [ ] Cocok |
| **Interface WAN**              | `WAN-ether1` (Internet ISP)                     | Network Engineer | [ ] Cocok |
| **Interface Server Dedicated** | `LAN-ether2` (Gateway `10.100.100.1/24`)        | Network Engineer | [ ] Cocok |
| **IP Server Mini PC SIPAS**    | `10.100.100.10` (Bypass Hotspot)                | Developer        | [ ] Cocok |
| **Interface VLAN 101 (TIK)**   | `vlan-TIK` (Subnet `10.87.1.0/24`)              | Network Engineer | [ ] Cocok |
| **Interface VLAN 138 (KORPRI)**| `vlan-KORPRI` (Subnet `10.87.38.0/24`)          | Network Engineer | [ ] Cocok |
| **Domain Gateway Hotspot**     | `hotspot.net` (`10.87.1.1` & `10.87.38.1`)      | Network Engineer | [ ] Cocok |
| **Domain Public Portal**       | `sipas.npma.my.id`                              | Developer        | [ ] Cocok |
| **Port API RouterOS**          | `8728` (User: `sipas-api`)                      | Network Engineer | [ ] Cocok |
| **Batas Perangkat (Max)**      | Default `4` Perangkat / User                    | Developer        | [ ] Cocok |
| **Format Queue Name**          | `hotspot-<username>`                            | Developer        | [ ] Cocok |
| **Script Mikrotik Produksi**   | `mikrotik_ccr2116_vlan_setup.rsc`               | Network Engineer | [ ] Cocok |
