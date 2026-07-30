const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();

/**
 * Daftar Akun Dummy SSO Diskominfo untuk Keperluan Pengujian
 */
const DUMMY_SSO_USERS = [
  {
    username: "197804132003121005",
    password: "197804132003121005",
    nama: "MILKI TEGUH BAGJA IRAWAN",
    nip: "197804132003121005",
    jabatan: "PRANATA KOMPUTER AHLI MUDA",
    golongan: "IV/a",
  },
  {
    username: "199001012023011001",
    password: "password123",
    nama: "Budi Santoso, S.Kom",
    nip: "199001012023011001",
    jabatan: "Pranata Komputer Ahli Pertama",
    golongan: "III/a",
  },
  {
    username: "199205122023012002",
    password: "password123",
    nama: "Siti Rahmawati, S.T",
    nip: "199205122023012002",
    jabatan: "Pengelola Jaringan",
    golongan: "III/b",
  },
];

/**
 * GET /api/sso-mock/users
 * Mendapatkan daftar user dummy yang tersedia untuk testing
 */
router.get("/users", (req, res) => {
  res.json({
    status: true,
    message: "Daftar user dummy SSO Diskominfo",
    users: DUMMY_SSO_USERS.map((u) => ({
      username: u.username,
      password: u.password,
      nama: u.nama,
      nip: u.nip,
      jabatan: u.jabatan,
      golongan: u.golongan,
    })),
  });
});

/**
 * POST /api/sso-mock/login
 * Menirukan endpoint POST sso.bandungkab.go.id/api/login
 * Body: username, password
 */
router.post("/login", upload.none(), (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({
      status: false,
      message: "Username dan password wajib diisi.",
    });
  }

  const cleanUsername = String(username).trim().toLowerCase();
  const cleanPassword = String(password);

  // Cari user dummy berdasarkan username / NIP
  const user = DUMMY_SSO_USERS.find(
    (u) =>
      u.username.toLowerCase() === cleanUsername &&
      u.password === cleanPassword,
  );

  if (!user) {
    return res.status(401).json({
      status: false,
      message: "Username atau password SSO tidak valid.",
    });
  }

  return res.status(200).json({
    status: true,
    data: {
      nip: user.nip,
      nama: user.nama,
      jabatan: user.jabatan,
      golongan: user.golongan || "III/a",
    },
    message: "Berhasil masuk",
  });
});

module.exports = router;
