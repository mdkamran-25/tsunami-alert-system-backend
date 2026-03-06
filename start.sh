#!/bin/sh
# Render startup script — run DB migrations then start the server
set -e

echo "⏳ Running Prisma migrations..."
npx prisma migrate deploy

echo "🚀 Starting Tsunami Alert Backend..."
exec node dist/index.js
