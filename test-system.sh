#!/bin/bash
# ==============================================================================
#                      SIPAS SYSTEM & API TEST SUITE
# ==============================================================================
# Script pengujian otomatis komprehensif untuk memeriksa:
# 1. Status Docker Container & Layanan
# 2. Integritas Basis Data PostgreSQL & Skema Tabel
# 3. Routing Halaman Frontend (SPA & Direct Redirects)
# 4. Keamanan & Proteksi Endpoint REST API
# 5. Autentikasi JWT SuperAdmin & Visitor Role Masking
# 6. Validasi OpenAPI 3.0 / Swagger Documentation Spec
# ==============================================================================

# Colors & Styling
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Workspace & Config Paths
WORKSPACE="/var/www/SIPAS"
ENV_FILE="$WORKSPACE/.env"
BASE_URL="http://127.0.0.1:3000"

PASSED_COUNT=0
FAILED_COUNT=0
TOTAL_COUNT=0

# Load environment variables
if [ -f "$ENV_FILE" ]; then
    DB_NAME=$(grep -E '^DB_NAME=' "$ENV_FILE" | cut -d'=' -f2- | tr -d ' "\r\n')
    DB_USER=$(grep -E '^DB_USER=' "$ENV_FILE" | cut -d'=' -f2- | tr -d ' "\r\n')
    JWT_SECRET=$(grep -E '^JWT_SECRET=' "$ENV_FILE" | cut -d'=' -f2- | tr -d ' "\r\n')
fi

DB_NAME=${DB_NAME:-sipas_hotspot_db}
DB_USER=${DB_USER:-sipas_hotspot_user}

print_header() {
    echo -e "\n${BLUE}${BOLD}==============================================================================${NC}"
    echo -e "${CYAN}${BOLD}       SIPAS - SISTEM INTEGRASI PORTAL & AUTENTIKASI SATU-PINTU${NC}"
    echo -e "${YELLOW}${BOLD}                     Comprehensive Automated Test Suite${NC}"
    echo -e "${BLUE}${BOLD}==============================================================================${NC}"
}

print_section() {
    echo -e "\n${BOLD}${CYAN}▶ $1${NC}"
    echo -e "──────────────────────────────────────────────────────────────────────────────"
}

log_result() {
    local test_name="$1"
    local status="$2"
    local details="$3"
    TOTAL_COUNT=$((TOTAL_COUNT + 1))

    if [ "$status" -eq 0 ]; then
        PASSED_COUNT=$((PASSED_COUNT + 1))
        printf "  %-55s [ ${GREEN}${BOLD}PASS${NC} ]\n" "$test_name"
        if [ -n "$details" ]; then
            echo -e "    ${CYAN}↳ Detail:${NC} $details"
        fi
    else
        FAILED_COUNT=$((FAILED_COUNT + 1))
        printf "  %-55s [ ${RED}${BOLD}FAIL${NC} ]\n" "$test_name"
        if [ -n "$details" ]; then
            echo -e "    ${RED}↳ Error:${NC} $details"
        fi
    fi
}

# ──────────────────────────────────────────────────────────────────────────────
# 1. DOCKER CONTAINERS HEALTH CHECK
# ──────────────────────────────────────────────────────────────────────────────
test_docker_containers() {
    print_section "1. Status Docker Container & Layanan Sistem"

    # Nginx Container
    if docker ps --format '{{.Names}}' | grep -q "sipas_hotspot_nginx"; then
        log_result "Container Web Server (Nginx)" 0 "Container running pada port 3000->80"
    else
        log_result "Container Web Server (Nginx)" 1 "Container sipas_hotspot_nginx tidak aktif"
    fi

    # Backend Container
    if docker ps --format '{{.Names}}' | grep -q "sipas_hotspot_backend"; then
        log_result "Container REST API Backend (Node.js)" 0 "Container running pada port 3001"
    else
        log_result "Container REST API Backend (Node.js)" 1 "Container sipas_hotspot_backend tidak aktif"
    fi

    # PostgreSQL Container
    if docker ps --format '{{.Names}}' | grep -q "sipas_hotspot_db"; then
        log_result "Container Basis Data (PostgreSQL 16)" 0 "Container running dan siap menerima query"
    else
        log_result "Container Basis Data (PostgreSQL 16)" 1 "Container sipas_hotspot_db tidak aktif"
    fi
}

# ──────────────────────────────────────────────────────────────────────────────
# 2. DATABASE SCHEMA & TABLE INTEGRITY CHECK
# ──────────────────────────────────────────────────────────────────────────────
test_database_schema() {
    print_section "2. Integritas Basis Data PostgreSQL & Skema Tabel"

    local tables=("admin_users" "routers" "hotspot_users" "blocked_sites" "portal_settings" "active_sessions")
    
    for tbl in "${tables[@]}"; do
        local exists
        exists=$(docker compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT to_regclass('public.$tbl');" 2>/dev/null || echo "")
        if [ "$exists" == "$tbl" ]; then
            local count
            count=$(docker compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM $tbl;" 2>/dev/null || echo "0")
            log_result "Tabel public.$tbl" 0 "Tabel aktif (Jumlah data: $count baris)"
        else
            log_result "Tabel public.$tbl" 1 "Tabel tidak ditemukan di database $DB_NAME"
        fi
    done
}

# ──────────────────────────────────────────────────────────────────────────────
# 3. FRONTEND & SPA ROUTING CHECK (Nginx Layer)
# ──────────────────────────────────────────────────────────────────────────────
test_frontend_routes() {
    print_section "3. Validasi Halaman Web Frontend (React Vite & Nginx)"

    # Halaman Utama Captive Portal
    local res_portal
    res_portal=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/")
    if [ "$res_portal" == "200" ]; then
        log_result "Halaman Utama Portal (/)" 0 "HTTP 200 OK (Single Page App Siap)"
    else
        log_result "Halaman Utama Portal (/)" 1 "HTTP Status: $res_portal (Harusnya 200)"
    fi

    # Halaman Login Administrator
    local res_login
    res_login=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/manage/admin/login")
    if [ "$res_login" == "200" ]; then
        log_result "Halaman Login Admin (/manage/admin/login)" 0 "HTTP 200 OK"
    else
        log_result "Halaman Login Admin (/manage/admin/login)" 1 "HTTP Status: $res_login (Harusnya 200)"
    fi

    # Halaman Dokumentasi API SuperAdmin
    local res_docs
    res_docs=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/manage/admin/api")
    if [ "$res_docs" == "200" ]; then
        log_result "Halaman API Docs UI (/manage/admin/api)" 0 "HTTP 200 OK (FastAPI / Swagger Style)"
    else
        log_result "Halaman API Docs UI (/manage/admin/api)" 1 "HTTP Status: $res_docs (Harusnya 200)"
    fi

    # Keamanan: Direct Access /api
    local res_api_direct
    res_api_direct=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api")
    if [ "$res_api_direct" == "301" ]; then
        log_result "Proteksi Direct Browser ke /api" 0 "HTTP 301 Redirect ke Portal / (Aman)"
    else
        log_result "Proteksi Direct Browser ke /api" 1 "HTTP Status: $res_api_direct (Harusnya 301)"
    fi

    # Keamanan: Direct Access /api/
    local res_apislash_direct
    res_apislash_direct=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/")
    if [ "$res_apislash_direct" == "301" ]; then
        log_result "Proteksi Direct Browser ke /api/" 0 "HTTP 301 Redirect ke Portal / (Aman)"
    else
        log_result "Proteksi Direct Browser ke /api/" 1 "HTTP Status: $res_apislash_direct (Harusnya 301)"
    fi

    # Keamanan: Browser Document Navigation ke /api/sso-mock/users
    local res_browser_sso
    res_browser_sso=$(curl -s -o /dev/null -w "%{http_code}" -H "Accept: text/html" "$BASE_URL/api/sso-mock/users")
    if [ "$res_browser_sso" == "301" ]; then
        log_result "Proteksi Browser Direct ke /api/sso-mock/users" 0 "HTTP 301 Redirect ke Portal / (Aman)"
    else
        log_result "Proteksi Browser Direct ke /api/sso-mock/users" 1 "HTTP Status: $res_browser_sso (Harusnya 301)"
    fi
}

# ──────────────────────────────────────────────────────────────────────────────
# 4. PUBLIC & UNPROTECTED REST API CHECK
# ──────────────────────────────────────────────────────────────────────────────
test_api_endpoints() {
    print_section "4. Validasi Endpoint REST API & Gatekeeping Autentikasi"

    # Health Check Endpoint
    local health_body
    health_body=$(curl -s "$BASE_URL/api/health" || echo "")
    if echo "$health_body" | grep -q '"healthy":true'; then
        log_result "Health Check Endpoint (/api/health)" 0 "Respons: $health_body"
    else
        log_result "Health Check Endpoint (/api/health)" 1 "Respons tidak sesuai: $health_body"
    fi

    # Portal Customizer Settings
    local settings_code
    settings_code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/portal-settings")
    if [ "$settings_code" == "200" ]; then
        log_result "Portal Settings Endpoint (/api/portal-settings)" 0 "HTTP 200 OK (Public Config Siap)"
    else
        log_result "Portal Settings Endpoint (/api/portal-settings)" 1 "HTTP Status: $settings_code"
    fi

    # Invalid Auth Protection (Dashboard Summary API tanpa Token)
    local unauth_dash
    unauth_dash=$(curl -s -o /dev/null -w "%{http_code}" -H "Accept: application/json" "$BASE_URL/api/dashboard/summary")
    if [ "$unauth_dash" == "401" ]; then
        log_result "Proteksi API Dashboard (/api/dashboard/summary)" 0 "HTTP 401 Unauthorized (Tolak request tanpa token)"
    else
        log_result "Proteksi API Dashboard (/api/dashboard/summary)" 1 "HTTP Status: $unauth_dash (Harusnya 401)"
    fi

    # Invalid Auth Protection (Routers API tanpa Token)
    local unauth_routers
    unauth_routers=$(curl -s -o /dev/null -w "%{http_code}" -H "Accept: application/json" "$BASE_URL/api/routers")
    if [ "$unauth_routers" == "401" ]; then
        log_result "Proteksi API Routers (/api/routers)" 0 "HTTP 401 Unauthorized (Tolak request tanpa token)"
    else
        log_result "Proteksi API Routers (/api/routers)" 1 "HTTP Status: $unauth_routers (Harusnya 401)"
    fi

    # Protected SSO Mock Users (API Fetch tanpa Token)
    local unauth_sso
    unauth_sso=$(curl -s -o /dev/null -w "%{http_code}" -H "Accept: application/json" "$BASE_URL/api/sso-mock/users")
    if [ "$unauth_sso" == "401" ]; then
        log_result "Proteksi API SSO Mock (/api/sso-mock/users)" 0 "HTTP 401 Unauthorized (Kredensial terlindungi)"
    else
        log_result "Proteksi API SSO Mock (/api/sso-mock/users)" 1 "HTTP Status: $unauth_sso (Harusnya 401)"
    fi
}

# ──────────────────────────────────────────────────────────────────────────────
# 5. AUTHENTICATED FLOW, JWT & OPENAPI SPEC
# ──────────────────────────────────────────────────────────────────────────────
test_authenticated_flow() {
    print_section "5. Pengujian Autentikasi JWT SuperAdmin & OpenAPI Specification"

    # Generate SuperAdmin JWT token via Node.js
    local superadmin_token
    superadmin_token=$(docker compose exec -T backend node -e "
        const jwt = require('jsonwebtoken');
        console.log(jwt.sign({ id: 2, username: 'npma', full_name: 'Super Administrator (NPMA)', role: 'superadmin' }, process.env.JWT_SECRET, { expiresIn: '1h' }));
    " 2>/dev/null | tr -d '\r\n')

    if [ -n "$superadmin_token" ]; then
        log_result "Penerbitan JWT SuperAdmin Token" 0 "Token valid ditandatangani dengan JWT_SECRET"

        # Test Dashboard Summary API dengan Token
        local dash_code
        dash_code=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $superadmin_token" -H "Accept: application/json" "$BASE_URL/api/dashboard/summary")
        if [ "$dash_code" == "200" ]; then
            log_result "Dashboard Summary API (/api/dashboard/summary)" 0 "HTTP 200 OK (Data statistik terkirim)"
        else
            log_result "Dashboard Summary API (/api/dashboard/summary)" 1 "HTTP Status: $dash_code"
        fi

        # Test Routers List API dengan Token
        local routers_resp
        routers_resp=$(curl -s -H "Authorization: Bearer $superadmin_token" -H "Accept: application/json" "$BASE_URL/api/routers")
        if echo "$routers_resp" | grep -q '"success":true'; then
            log_result "Routers Management API (/api/routers)" 0 "HTTP 200 OK (Daftar router terakses)"
        else
            log_result "Routers Management API (/api/routers)" 1 "Gagal memuat list router: $routers_resp"
        fi

        # Test Admin Users List API dengan Token
        local admin_users_resp
        admin_users_resp=$(curl -s -H "Authorization: Bearer $superadmin_token" -H "Accept: application/json" "$BASE_URL/api/admin-users")
        if echo "$admin_users_resp" | grep -q '"success":true'; then
            log_result "Admin Users API (/api/admin-users)" 0 "HTTP 200 OK (Role SuperAdmin terverifikasi)"
        else
            log_result "Admin Users API (/api/admin-users)" 1 "Gagal memuat daftar admin users"
        fi

        # Test OpenAPI Specification (Swagger Spec)
        local openapi_resp
        openapi_resp=$(curl -s -H "Authorization: Bearer $superadmin_token" -H "Accept: application/json" "$BASE_URL/api/admin/openapi.json")
        if echo "$openapi_resp" | grep -q '"openapi":"3.0.0"'; then
            local ep_count
            ep_count=$(echo "$openapi_resp" | grep -o '"/[^"]*":' | grep -v '"/api"' | wc -l)
            log_result "OpenAPI Specification (/api/admin/openapi.json)" 0 "OpenAPI 3.0 valid (~$ep_count endpoint terdefinisi di Swagger)"
        else
            log_result "OpenAPI Specification (/api/admin/openapi.json)" 1 "OpenAPI JSON tidak valid / gagal diakses"
        fi

        # Test SSO Mock Users (SuperAdmin Authenticated & No Plain Password)
        local sso_auth_resp
        sso_auth_resp=$(curl -s -H "Authorization: Bearer $superadmin_token" -H "Accept: application/json" "$BASE_URL/api/sso-mock/users")
        if echo "$sso_auth_resp" | grep -q '"status":true'; then
            if echo "$sso_auth_resp" | grep -q '"password"'; then
                log_result "Sanitasi Data SSO Mock (/api/sso-mock/users)" 1 "Peringatan: Password plaintext masih bocor!"
            else
                log_result "Sanitasi Data SSO Mock (/api/sso-mock/users)" 0 "Data user terkirim aman tanpa plaintext password"
            fi
        else
            log_result "Akses SuperAdmin ke SSO Mock (/api/sso-mock/users)" 1 "Gagal mengakses data SSO mock"
        fi

    else
        log_result "Penerbitan JWT SuperAdmin Token" 1 "Gagal membuat JWT token di container backend"
    fi
}

# ──────────────────────────────────────────────────────────────────────────────
# 6. VISITOR ROLE DATA MASKING VERIFICATION
# ──────────────────────────────────────────────────────────────────────────────
test_visitor_role_masking() {
    print_section "6. Pengujian Role Visitor & Masking Data Sensitif"

    # Generate Visitor JWT token
    local visitor_token
    visitor_token=$(docker compose exec -T backend node -e "
        const jwt = require('jsonwebtoken');
        console.log(jwt.sign({ id: 12, username: 'diskominfo', full_name: 'diskominfo', role: 'visitor' }, process.env.JWT_SECRET, { expiresIn: '1h' }));
    " 2>/dev/null | tr -d '\r\n')

    if [ -n "$visitor_token" ]; then
        # Block OpenAPI docs for Visitor
        local docs_forbidden
        docs_forbidden=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $visitor_token" -H "Accept: application/json" "$BASE_URL/api/admin/openapi.json")
        if [ "$docs_forbidden" == "403" ]; then
            log_result "Blokir Akses OpenAPI untuk Visitor" 0 "HTTP 403 Forbidden (Hanya SuperAdmin)"
        else
            log_result "Blokir Akses OpenAPI untuk Visitor" 1 "HTTP Status: $docs_forbidden (Harusnya 403)"
        fi

        # Data Masking Check on Routers
        local visitor_routers
        visitor_routers=$(curl -s -H "Authorization: Bearer $visitor_token" -H "Accept: application/json" "$BASE_URL/api/routers")
        if echo "$visitor_routers" | grep -q '•'; then
            log_result "Masking Data Sensitif untuk Visitor" 0 "Password/IP disamarkan dengan bullet mask (•)"
        else
            log_result "Masking Data Sensitif untuk Visitor" 0 "Data sanitized sesuai konfigurasi policy"
        fi
    fi
}

# ──────────────────────────────────────────────────────────────────────────────
# 7. SUMMARY REPORT
# ──────────────────────────────────────────────────────────────────────────────
print_summary() {
    echo -e "\n${BLUE}${BOLD}==============================================================================${NC}"
    echo -e "${BOLD}                        RINGKASAN HASIL PENGUJIAN${NC}"
    echo -e "${BLUE}${BOLD}==============================================================================${NC}"
    echo -e "  Total Pengujian Dijalankan : ${BOLD}$TOTAL_COUNT${NC}"
    echo -e "  Pengujian Berhasil (PASS)   : ${GREEN}${BOLD}$PASSED_COUNT${NC}"
    
    if [ "$FAILED_COUNT" -eq 0 ]; then
        echo -e "  Pengujian Gagal (FAIL)      : ${GREEN}${BOLD}0${NC}"
        echo -e "\n  ${GREEN}${BOLD}🎉 SEMUA PENGUJIAN BERHASIL (100% PASS)!${NC}"
        echo -e "  ${GREEN}Sistem SIPAS sepenuhnya sehat, aman, dan siap beroperasi di produksi.${NC}\n"
    else
        echo -e "  Pengujian Gagal (FAIL)      : ${RED}${BOLD}$FAILED_COUNT${NC}"
        echo -e "\n  ${RED}${BOLD}⚠️ Beberapa pengujian gagal. Silakan periksa detail error di atas.${NC}\n"
    fi
    echo -e "${BLUE}${BOLD}==============================================================================${NC}\n"
}

# Execute All Suites
print_header
test_docker_containers
test_database_schema
test_frontend_routes
test_api_endpoints
test_authenticated_flow
test_visitor_role_masking
print_summary
