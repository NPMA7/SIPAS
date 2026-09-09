#!/bin/bash
set -e

echo "🔨 Building & Updating Backend Container..."
cd /var/www/SIPAS

# Rebuild image backend jika ada perubahan dependency / Dockerfile
docker compose build backend

echo "🔄 Starting & Recreating Backend service..."
docker compose up -d --force-recreate --renew-anon-volumes backend

echo "🔄 Ensuring Nginx is running..."
docker compose restart nginx

echo "📋 Checking Backend logs..."
docker compose logs --tail=15 backend

echo "✅ Backend & Nginx berhasil di-build dan berjalan!"
