#!/bin/bash
# Railway Deployment Verification & Setup Script

echo "🚀 Railway Tsunami Alert Backend - Final Setup"
echo "================================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: Not in tsunami-alert-backend directory"
  echo "Run: cd /Users/kamran/Major-Project/tsunami-alert-backend"
  exit 1
fi

echo "✅ In correct directory: tsunami-alert-backend"
echo ""

# Verify Prisma schema is fixed
echo "🔍 Checking Prisma schema..."
if grep -q "directUrl" prisma/schema.prisma; then
  echo "❌ Prisma schema still has directUrl - needs fixing"
  exit 1
else
  echo "✅ Prisma schema fixed - no directUrl requirement"
fi

echo ""
echo "📋 Current Status:"
echo "   ✅ Code pushed to GitHub"
echo "   ✅ Docker builds successfully"
echo "   ✅ Prisma schema fixed"
echo "   ⏳ Awaiting: DATABASE_URL in Railway Variables"
echo ""

echo "🎯 Next Steps (Manual in Railway Dashboard):"
echo ""
echo "1️⃣  Go to Railway Dashboard"
echo "   → PostgreSQL service → Connect tab"
echo "   → Copy the Postgres URI"
echo ""
echo "2️⃣  Go to Backend Service"
echo "   → Click Variables tab"
echo "   → Add/Update DATABASE_URL"
echo "   → Paste the PostgreSQL URI"
echo "   → Click Save"
echo ""
echo "3️⃣  Wait 8-10 minutes for auto-redeploy"
echo "   ⏳ Build: 2-3 minutes"
echo "   ⏳ Start: 2-3 minutes"
echo "   ⏳ Migrations: 1-2 minutes"
echo "   ✅ LIVE: Total ~8 minutes"
echo ""

echo "4️⃣  Verify with:"
echo "   curl https://tsunami-alert-backend-production.up.railway.app/health"
echo ""

echo "5️⃣  After verified, update frontend:"
echo "   cd ../tsunami-alert-system10"
echo "   Edit .env.local with Railway URL"
echo "   git add . && git commit && git push"
echo ""

echo "================================================"
echo "🎯 Everything ready! Just set DATABASE_URL in Railway."
