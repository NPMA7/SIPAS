#!/bin/bash
set -e

echo "🔨 Building Frontend React (Vite)..."
cd /var/www/SIPAS
docker compose run --rm -v /var/www/SIPAS/frontend:/frontend -w /frontend backend ./node_modules/.bin/vite build

echo "🔄 Restarting Nginx web server..."
docker compose restart nginx

echo "✅ Frontend berhasil di-build dan Nginx telah di-restart!"
