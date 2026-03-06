#!/bin/bash
# Supabase Integration Setup Script
# This script guides you through setting up Supabase for the Tsunami Alert System

set -e

echo "🚀 Tsunami Alert System - Supabase Integration Setup"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from .env.example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env file${NC}"
    echo ""
    echo "📝 Please edit .env with your Supabase credentials:"
    echo "   nano .env"
    echo ""
    echo "You need to add:"
    echo "  - DATABASE_URL (from Settings → Database)"
    echo "  - SUPABASE_URL (from Settings → API)"
    echo "  - SUPABASE_ANON_KEY (from Settings → API)"
    echo "  - SUPABASE_SERVICE_KEY (from Settings → API)"
    echo ""
    echo "Get these from: https://supabase.com/projects"
    exit 1
fi

echo "✅ .env file found"
echo ""

# Check Node.js
echo -e "${BLUE}Checking Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Node.js not found. Please install Node.js 20+${NC}"
    exit 1
fi
NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js ${NODE_VERSION}${NC}"
echo ""

# Check npm
echo -e "${BLUE}Checking npm...${NC}"
if ! command -v npm &> /dev/null; then
    echo -e "${YELLOW}npm not found${NC}"
    exit 1
fi
NPM_VERSION=$(npm -v)
echo -e "${GREEN}✓ npm ${NPM_VERSION}${NC}"
echo ""

# Install dependencies
echo -e "${BLUE}Installing dependencies...${NC}"
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Generate Prisma Client
echo -e "${BLUE}Generating Prisma Client...${NC}"
npm run db:generate
echo -e "${GREEN}✓ Prisma Client generated${NC}"
echo ""

# Push schema to Supabase
echo -e "${BLUE}Deploying database schema to Supabase...${NC}"
echo "This will create all tables in your Supabase database."
echo "Press Enter to continue, or Ctrl+C to cancel."
read -r

npm run db:push
echo -e "${GREEN}✓ Schema deployed to Supabase${NC}"
echo ""

# Seed database
echo -e "${BLUE}Seeding database with demo data...${NC}"
echo "This will populate your database with sample GPS stations, satellite data, etc."
echo "Press Enter to continue, or Ctrl+C to skip."
read -r

npm run db:seed
echo -e "${GREEN}✓ Database seeded with demo data${NC}"
echo ""

# Test connection
echo -e "${BLUE}Testing database connection...${NC}"
cat > test-connection.mjs << 'EOF'
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  const userCount = await prisma.user.count();
  const stationCount = await prisma.gPSStation.count();
  const readingCount = await prisma.gPSReading.count();
  
  console.log('✅ Database connection successful!');
  console.log(`   Users: ${userCount}`);
  console.log(`   GPS Stations: ${stationCount}`);
  console.log(`   GPS Readings: ${readingCount}`);
} catch (error) {
  console.error('❌ Database connection failed:', error.message);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
EOF

node test-connection.mjs
rm test-connection.mjs
echo ""

# Summary
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Supabase Integration Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo ""
echo "📊 Database Setup:"
echo "  • Database: Supabase PostgreSQL"
echo "  • Extensions: PostGIS, TimescaleDB"
echo "  • Tables: 13 models created"
echo "  • Sample data: Seeded"
echo ""
echo "🚀 Next Steps:"
echo "  1. Start the development server:"
echo "     npm run dev"
echo ""
echo "  2. Access GraphQL API:"
echo "     http://localhost:4000/graphql"
echo ""
echo "  3. Manage database in Supabase:"
echo "     https://supabase.com/projects"
echo ""
echo "  4. View documentation:"
echo "     • SUPABASE_SETUP.md - Complete setup guide"
echo "     • SETUP_GUIDE.md - Development workflow"
echo "     • README.md - API documentation"
echo ""
echo -e "${BLUE}Happy coding! 🎉${NC}"
