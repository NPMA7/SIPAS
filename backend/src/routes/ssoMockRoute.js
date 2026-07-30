const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();

/**
 * Daftar Akun Dummy SSO untuk Keperluan Pengujian
 */
const DUMMY_SSO_USERS = [
  {
    username: "09122006",
    password: "09122006",
    nama: "N PASHA MALIK ALMA",
    nip: "09122006",
    jabatan: "PETUGAS JARINGAN",
    golongan: "IV/a",
  },
  {
    username: "09122007",
    password: "09122007",
    nama: "Aji Mubarok",
    nip: "09122007",
    jabatan: "PETUGAS JARINGAN ",
    golongan: "III/a",
  },
  {
    username: "09122008",
    password: "09122008",
    nama: "Andi Firmansyah",
    nip: "09122008",
    jabatan: "PETUGAS JARINGAN",
    golongan: "III/a",
  },
];

/**
 * GET /api/sso-mock/users
 * Mendapatkan daftar user dummy yang tersedia untuk testing
 */
router.get("/users", (req, res) => {
  res.json({
    status: true,
    message: "Daftar user dummy SSO",
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
 * Menirukan endpoint POST SSO
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
