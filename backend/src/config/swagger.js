const swaggerSpec = {
  openapi: "3.0.0",
  info: {
    title: "SIPAS REST API",
    version: "1.0.0",
    description: "Sistem Integrasi Portal & Autentikasi Satu-Pintu (SIPAS) — REST API Documentation.",
    contact: {
      name: "Tim Pengembang SIPAS",
      url: "https://github.com/NPMA7/SIPAS"
    }
  },
  servers: [
    {
      url: "/api",
      description: "Default API Server"
    }
  ],
  tags: [
    { name: "System", description: "Health check & status sistem" },
    { name: "Admin Auth & Profile", description: "Autentikasi admin panel & manajemen profil" },
    { name: "Captive Portal", description: "Autentikasi user hotspot & captive portal login" },
    { name: "Dashboard & Monitoring", description: "Statistik global & status realtime MikroTik" },
    { name: "Hotspot Users", description: "Manajemen data user hotspot, limit bandwidth & blokir situs" },
    { name: "MikroTik Routers", description: "Manajemen dan tes koneksi router MikroTik" },
    { name: "Hotspot Realtime Operations", description: "Operasi langsung tabel MikroTik (/ip hotspot active, host, ip-binding)" },
    { name: "Simple Queues (Bandwidth)", description: "Manajemen limit kecepatan antrean (/queue simple)" },
    { name: "DHCP Leases", description: "Pemantauan & penghapusan lease IP DHCP" },
    { name: "Blocked Sites", description: "Manajemen domain situs diblokir & sinkronisasi firewall" },
    { name: "Admin Users", description: "Manajemen akun admin & hak akses pengelola (SuperAdmin)" },
    { name: "Portal Customizer", description: "Pengaturan tampilan tema, logo, dan background Captive Portal" },
    { name: "SSO Mock Engine", description: "Mocking endpoint SSO untuk keperluan pengetesan" }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Masukkan JWT token yang diperoleh dari /api/admin/login"
      }
    },
    schemas: {
      ApiResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Operasi berhasil." },
          data: { type: "object" }
        }
      },
      AdminLoginRequest: {
        type: "object",
        required: ["username", "password"],
        properties: {
          username: { type: "string", example: "admin" },
          password: { type: "string", example: "admin123" }
        }
      },
      AdminChangePasswordRequest: {
        type: "object",
        required: ["current_password", "new_password"],
        properties: {
          current_password: { type: "string", example: "admin123" },
          new_password: { type: "string", example: "newSecurePass123" }
        }
      },
      PortalLoginRequest: {
        type: "object",
        required: ["username", "password"],
        properties: {
          username: { type: "string", example: "09122006" },
          password: { type: "string", example: "09122006" },
          ip: { type: "string", example: "10.100.100.254" },
          mac: { type: "string", example: "AA:BB:CC:DD:EE:FF" },
          link_login: { type: "string", example: "http://10.100.100.1/login" }
        }
      },
      HotspotUser: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          username: { type: "string", example: "09122006" },
          full_name: { type: "string", example: "N PASHA MALIK ALMA" },
          email: { type: "string", example: "pasha@example.com" },
          phone: { type: "string", example: "08123456789" },
          bandwidth_limit: { type: "string", example: "10M/10M" },
          max_devices: { type: "integer", example: 2 },
          website_block: { type: "boolean", example: true },
          is_active: { type: "boolean", example: true },
          auth_provider: { type: "string", enum: ["local", "sso"], example: "sso" },
          nip: { type: "string", example: "09122006" },
          jabatan: { type: "string", example: "PETUGAS JARINGAN" },
          instansi: { type: "string", example: "Dinas Kominfo" },
          router_id: { type: "integer", example: 1 },
          router_name: { type: "string", example: "CCR2116-12G-4S+" }
        }
      },
      CreateUserRequest: {
        type: "object",
        required: ["username", "password", "full_name"],
        properties: {
          username: { type: "string", example: "budi_santoso" },
          password: { type: "string", example: "Password123!" },
          full_name: { type: "string", example: "Budi Santoso" },
          email: { type: "string", example: "budi@example.com" },
          phone: { type: "string", example: "081299998888" },
          bandwidth_limit: { type: "string", example: "5M/5M" },
          max_devices: { type: "integer", example: 1 },
          website_block: { type: "boolean", example: false },
          router_id: { type: "integer", example: 1 },
          auth_provider: { type: "string", enum: ["local", "sso"], example: "local" },
          notes: { type: "string", example: "Staf IT" }
        }
      },
      Router: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          name: { type: "string", example: "CCR2116-12G-4S+" },
          ip_address: { type: "string", example: "10.100.100.1" },
          api_port: { type: "integer", example: 8728 },
          api_username: { type: "string", example: "admin" },
          location: { type: "string", example: "Server Room Lt. 2" },
          router_type: { type: "string", enum: ["internal", "external"], example: "internal" },
          is_active: { type: "boolean", example: true },
          last_seen: { type: "string", example: "2026-09-09T07:30:00.000Z" }
        }
      },
      CreateRouterRequest: {
        type: "object",
        required: ["name", "ip_address"],
        properties: {
          name: { type: "string", example: "RB951-Gedung-B" },
          ip_address: { type: "string", example: "192.168.88.1" },
          api_port: { type: "integer", example: 8728 },
          api_username: { type: "string", example: "admin" },
          api_password: { type: "string", example: "passwordRouter" },
          location: { type: "string", example: "Gedung B Lt. 1" },
          router_type: { type: "string", enum: ["internal", "external"], example: "internal" },
          is_active: { type: "boolean", example: true }
        }
      },
      BlockedSite: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          domain: { type: "string", example: "judionline.com" },
          category: { type: "string", example: "Perjudian" },
          description: { type: "string", example: "Situs judi terlarang" },
          user_ids: { type: "array", items: { type: "integer" }, example: [1, 2] }
        }
      },
      PortalSettings: {
        type: "object",
        properties: {
          portal_title: { type: "string", example: "Portal SIPAS" },
          portal_subtitle: { type: "string", example: "Sistem Integrasi Portal & Autentikasi Satu-Pintu" },
          bg_type: { type: "string", enum: ["color", "image"], example: "color" },
          bg_color: { type: "string", example: "#0b0f19" },
          bg_overlay_opacity: { type: "integer", example: 60 },
          card_bg_color: { type: "string", example: "#111827" },
          card_opacity: { type: "integer", example: 95 },
          primary_color: { type: "string", example: "#2563eb" },
          logo_type: { type: "string", enum: ["default", "custom"], example: "default" },
          footer_text: { type: "string", example: "Butuh bantuan? Hubungi administrator jaringan" }
        }
      }
    }
  },
  paths: {
    "/health": {
      get: {
        tags: ["System"],
        summary: "Health Check Server",
        description: "Memeriksa status hidup backend API.",
        responses: {
          200: {
            description: "Server sehat",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "ok" },
                    healthy: { type: "boolean", example: true }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/admin/login": {
      post: {
        tags: ["Admin Auth & Profile"],
        summary: "Login Admin",
        description: "Mendapatkan JWT token untuk otentikasi dashboard admin.",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/AdminLoginRequest" } } }
        },
        responses: {
          200: {
            description: "Login berhasil",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    token: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6..." },
                    admin: { type: "object" }
                  }
                }
              }
            }
          },
          401: { description: "Username atau password salah" }
        }
      }
    },
    "/admin/profile": {
      get: {
        tags: ["Admin Auth & Profile"],
        summary: "Get Profile Admin",
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: "Data profil admin yang sedang login" },
          401: { description: "Token tidak valid atau belum login" }
        }
      }
    },
    "/admin/change-password": {
      put: {
        tags: ["Admin Auth & Profile"],
        summary: "Ubah Password Admin",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/AdminChangePasswordRequest" } } }
        },
        responses: {
          200: { description: "Password berhasil diubah" },
          400: { description: "Password lama salah atau format tidak valid" }
        }
      }
    },
    "/portal/login": {
      post: {
        tags: ["Captive Portal"],
        summary: "Login Pengguna Hotspot (Portal)",
        description: "Autentikasi pengguna di Captive Portal (Local DB / SSO).",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/PortalLoginRequest" } } }
        },
        responses: {
          200: { description: "Login hotspot berhasil" },
          401: { description: "Kredensial salah atau akun dinonaktifkan" }
        }
      }
    },
    "/portal/logout": {
      post: {
        tags: ["Captive Portal"],
        summary: "Logout Pengguna Hotspot (Portal)",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  username: { type: "string", example: "09122006" },
                  ip: { type: "string", example: "10.100.100.254" }
                }
              }
            }
          }
        },
        responses: {
          200: { description: "Logout berhasil" }
        }
      }
    },
    "/dashboard/summary": {
      get: {
        tags: ["Dashboard & Monitoring"],
        summary: "Statistik Ringkasan Dashboard",
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: "Ringkasan total user, sesi aktif DB, dan user diblokir"
          }
        }
      }
    },
    "/dashboard/{routerId}/stats": {
      get: {
        tags: ["Dashboard & Monitoring"],
        summary: "Status Sumber Daya Router MikroTik (Realtime)",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "routerId", in: "path", required: true, schema: { type: "integer" }, example: 1 }
        ],
        responses: {
          200: { description: "CPU, Memory, HDD, Uptime, & Versi RouterOS" }
        }
      }
    },
    "/dashboard/{routerId}/sessions": {
      get: {
        tags: ["Dashboard & Monitoring"],
        summary: "Daftar Sesi Hotspot Aktif Router",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "routerId", in: "path", required: true, schema: { type: "integer" }, example: 1 }
        ],
        responses: {
          200: { description: "Daftar sesi aktif dari /ip hotspot active" }
        }
      }
    },
    "/users": {
      get: {
        tags: ["Hotspot Users"],
        summary: "Daftar Pengguna Hotspot",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
          { name: "search", in: "query", schema: { type: "string" }, description: "Cari username, nama, nip, instansi" },
          { name: "router_id", in: "query", schema: { type: "integer" } },
          { name: "is_active", in: "query", schema: { type: "boolean" } },
          { name: "auth_provider", in: "query", schema: { type: "string", enum: ["local", "sso"] } }
        ],
        responses: {
          200: { description: "Daftar user beserta metadata paginasi" }
        }
      },
      post: {
        tags: ["Hotspot Users"],
        summary: "Tambah Pengguna Hotspot",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateUserRequest" } } }
        },
        responses: {
          201: { description: "User berhasil dibuat dan disinkronkan ke router" },
          400: { description: "Username sudah terdaftar atau validasi gagal" }
        }
      }
    },
    "/users/{id}": {
      get: {
        tags: ["Hotspot Users"],
        summary: "Detail Pengguna Berdasarkan ID",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: { description: "Data detail user" },
          404: { description: "User tidak ditemukan" }
        }
      },
      put: {
        tags: ["Hotspot Users"],
        summary: "Update Pengguna Hotspot",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateUserRequest" } } }
        },
        responses: {
          200: { description: "User berhasil diperbarui" }
        }
      },
      delete: {
        tags: ["Hotspot Users"],
        summary: "Hapus Pengguna Hotspot",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: { description: "User berhasil dihapus dari DB dan router" }
        }
      }
    },
    "/users/{id}/bandwidth": {
      put: {
        tags: ["Hotspot Users"],
        summary: "Update Cepat Limit Bandwidth",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["bandwidth_limit"],
                properties: { bandwidth_limit: { type: "string", example: "10M/10M" } }
              }
            }
          }
        },
        responses: { 200: { description: "Limit bandwidth berhasil diperbarui" } }
      }
    },
    "/users/{id}/block": {
      put: {
        tags: ["Hotspot Users"],
        summary: "Toggle Status Pemblokiran Situs",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["website_block"],
                properties: { website_block: { type: "boolean", example: true } }
              }
            }
          }
        },
        responses: { 200: { description: "Status blokir situs user diperbarui" } }
      }
    },
    "/users/export": {
      get: {
        tags: ["Hotspot Users"],
        summary: "Export Data User ke CSV (SuperAdmin)",
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: "File CSV hotspot users",
            content: { "text/csv": { schema: { type: "string", format: "binary" } } }
          }
        }
      }
    },
    "/users/import-csv": {
      post: {
        tags: ["Hotspot Users"],
        summary: "Import Pengguna Massal via File CSV",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["file"],
                properties: {
                  file: { type: "string", format: "binary", description: "File CSV pengguna" }
                }
              }
            }
          }
        },
        responses: {
          200: { description: "Hasil impor (sukses/gagal)" }
        }
      }
    },
    "/routers": {
      get: {
        tags: ["MikroTik Routers"],
        summary: "Daftar Router MikroTik",
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: "Daftar router terdaftar" }
        }
      },
      post: {
        tags: ["MikroTik Routers"],
        summary: "Tambah Router MikroTik Baru",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateRouterRequest" } } }
        },
        responses: {
          201: { description: "Router berhasil didaftarkan" }
        }
      }
    },
    "/routers/{id}": {
      get: {
        tags: ["MikroTik Routers"],
        summary: "Detail Router",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Data router" } }
      },
      put: {
        tags: ["MikroTik Routers"],
        summary: "Update Konfigurasi Router",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateRouterRequest" } } }
        },
        responses: { 200: { description: "Router diperbarui" } }
      },
      delete: {
        tags: ["MikroTik Routers"],
        summary: "Hapus Router",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Router berhasil dihapus" } }
      }
    },
    "/routers/{id}/test": {
      get: {
        tags: ["MikroTik Routers"],
        summary: "Tes Koneksi API ke MikroTik",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: { description: "Koneksi berhasil dan menampilkan informasi router" },
          500: { description: "Gagal terhubung ke router" }
        }
      }
    },
    "/hotspot-router/active": {
      get: {
        tags: ["Hotspot Realtime Operations"],
        summary: "Ambil Sesi Aktif Router (/ip hotspot active)",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "router_id", in: "query", schema: { type: "integer" } }],
        responses: { 200: { description: "Daftar sesi aktif" } }
      }
    },
    "/hotspot-router/active/{id}": {
      delete: {
        tags: ["Hotspot Realtime Operations"],
        summary: "Kick Sesi Aktif Tertentu",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "router_id", in: "query", schema: { type: "integer" } }
        ],
        responses: { 200: { description: "Sesi berhasil diputuskan" } }
      }
    },
    "/hotspot-router/hosts": {
      get: {
        tags: ["Hotspot Realtime Operations"],
        summary: "Daftar Host MikroTik (/ip hotspot host)",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "router_id", in: "query", schema: { type: "integer" } }],
        responses: { 200: { description: "Daftar host hotspot" } }
      }
    },
    "/hotspot-router/hosts/bypass": {
      post: {
        tags: ["Hotspot Realtime Operations"],
        summary: "Toggle IP Binding Bypass Host",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["mac", "router_id"],
                properties: {
                  mac: { type: "string", example: "AA:BB:CC:DD:EE:FF" },
                  router_id: { type: "integer", example: 1 },
                  comment: { type: "string", example: "Bypass SmartTV" }
                }
              }
            }
          }
        },
        responses: { 200: { description: "Status bypass berhasil diubah" } }
      }
    },
    "/hotspot-router/bindings": {
      get: {
        tags: ["Hotspot Realtime Operations"],
        summary: "Daftar IP Bindings (/ip hotspot ip-binding)",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "router_id", in: "query", schema: { type: "integer" } }],
        responses: { 200: { description: "Daftar IP Binding" } }
      },
      post: {
        tags: ["Hotspot Realtime Operations"],
        summary: "Tambah IP Binding Baru",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["mac_address", "type", "router_id"],
                properties: {
                  mac_address: { type: "string", example: "AA:BB:CC:DD:EE:FF" },
                  address: { type: "string", example: "10.100.100.50" },
                  type: { type: "string", enum: ["bypassed", "blocked", "regular"], example: "bypassed" },
                  comment: { type: "string", example: "Printer Kantor" },
                  router_id: { type: "integer", example: 1 }
                }
              }
            }
          }
        },
        responses: { 201: { description: "IP Binding berhasil dibuat" } }
      }
    },
    "/hotspot-router/bindings/{id}": {
      delete: {
        tags: ["Hotspot Realtime Operations"],
        summary: "Hapus IP Binding",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "router_id", in: "query", schema: { type: "integer" } }
        ],
        responses: { 200: { description: "IP Binding dihapus" } }
      }
    },
    "/queues/{routerId}": {
      get: {
        tags: ["Simple Queues (Bandwidth)"],
        summary: "Daftar Simple Queues Router (/queue simple)",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "routerId", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Daftar queue antrean bandwidth" } }
      }
    },
    "/queues/{routerId}/action": {
      post: {
        tags: ["Simple Queues (Bandwidth)"],
        summary: "Aksi Simple Queue (enable/disable/set-limit/remove)",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "routerId", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["action", "queue_id"],
                properties: {
                  action: { type: "string", enum: ["enable", "disable", "set-limit", "remove"], example: "set-limit" },
                  queue_id: { type: "string", example: "*1" },
                  max_limit: { type: "string", example: "20M/20M" }
                }
              }
            }
          }
        },
        responses: { 200: { description: "Aksi queue berhasil dieksekusi" } }
      }
    },
    "/dhcp/leases": {
      get: {
        tags: ["DHCP Leases"],
        summary: "Daftar Lease IP DHCP (/ip dhcp-server lease)",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "router_id", in: "query", schema: { type: "integer" } }],
        responses: { 200: { description: "Daftar DHCP Leases" } }
      }
    },
    "/dhcp/leases/{id}": {
      delete: {
        tags: ["DHCP Leases"],
        summary: "Hapus Entri DHCP Lease",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "router_id", in: "query", required: true, schema: { type: "integer" } }
        ],
        responses: { 200: { description: "Lease berhasil dihapus" } }
      }
    },
    "/blocked-sites": {
      get: {
        tags: ["Blocked Sites"],
        summary: "Daftar Situs Diblokir",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Daftar domain yang diblokir" } }
      },
      post: {
        tags: ["Blocked Sites"],
        summary: "Tambah Domain yang Diblokir",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["domain"],
                properties: {
                  domain: { type: "string", example: "judionline.com" },
                  category: { type: "string", example: "Perjudian" },
                  description: { type: "string", example: "Situs terlarang" },
                  user_ids: { type: "array", items: { type: "integer" }, example: [1, 2] }
                }
              }
            }
          }
        },
        responses: { 201: { description: "Situs blokir berhasil ditambahkan" } }
      }
    },
    "/blocked-sites/{id}": {
      put: {
        tags: ["Blocked Sites"],
        summary: "Update Situs Diblokir",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: { "application/json": { schema: { $ref: "#/components/schemas/BlockedSite" } } }
        },
        responses: { 200: { description: "Situs diperbarui" } }
      },
      delete: {
        tags: ["Blocked Sites"],
        summary: "Hapus Situs dari Daftar Blokir",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Situs dihapus dari daftar blokir dan firewall" } }
      }
    },
    "/admin-users": {
      get: {
        tags: ["Admin Users"],
        summary: "Daftar Pengelola Web (SuperAdmin)",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Daftar akun admin" } }
      },
      post: {
        tags: ["Admin Users"],
        summary: "Tambah Akun Pengelola Baru (SuperAdmin)",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["username", "password", "full_name", "role"],
                properties: {
                  username: { type: "string", example: "operator1" },
                  password: { type: "string", example: "OperatorPass123!" },
                  full_name: { type: "string", example: "Operator Jaringan 1" },
                  email: { type: "string", example: "op1@sipas.local" },
                  role: { type: "string", enum: ["superadmin", "operator", "visitor"], example: "operator" },
                  is_active: { type: "boolean", example: true }
                }
              }
            }
          }
        },
        responses: { 201: { description: "Akun admin berhasil dibuat" } }
      }
    },
    "/portal-settings": {
      get: {
        tags: ["Portal Customizer"],
        summary: "Ambil Pengaturan Tampilan Portal (Publik)",
        responses: { 200: { description: "Konfigurasi tampilan Captive Portal" } }
      },
      put: {
        tags: ["Portal Customizer"],
        summary: "Simpan Kustomisasi Tampilan Portal",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/PortalSettings" } } }
        },
        responses: { 200: { description: "Pengaturan portal berhasil disimpan" } }
      }
    },
    "/portal-settings/reset": {
      post: {
        tags: ["Portal Customizer"],
        summary: "Reset Tampilan Portal ke Nilai Default",
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: "Tampilan kembali ke default" } }
      }
    },
    "/sso-mock/users": {
      get: {
        tags: ["SSO Mock Engine"],
        summary: "Daftar Akun User Dummy SSO",
        responses: { 200: { description: "Daftar user SSO mock yang tersedia untuk testing" } }
      }
    },
    "/sso-mock/login": {
      post: {
        tags: ["SSO Mock Engine"],
        summary: "Endpoint Simulasi Login SSO",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["username", "password"],
                properties: {
                  username: { type: "string", example: "09122006" },
                  password: { type: "string", example: "09122006" }
                }
              }
            }
          }
        },
        responses: {
          200: { description: "Autentikasi SSO sukses" },
          401: { description: "Kredensial SSO salah" }
        }
      }
    }
  }
};

module.exports = swaggerSpec;
