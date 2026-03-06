#!/bin/bash
# Quick initialization script for new developers
# This script gets you up and running in 2 minutes

echo "⚡ Tsunami Alert System - Quick Start"
echo "======================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found!"
    echo ""
    echo "Please follow these steps:"
    echo "1. Go to https://supabase.com/projects"
    echo "2. Create project 'tsunami-alert-dev'"
    echo "3. Copy connection string from Settings → Database"
    echo ""
    echo "Then run:"
    echo "  cp .env.example .env"
    echo "  nano .env"
    echo "  # Add your Supabase credentials"
    echo ""
    exit 1
fi

echo "📦 Installing dependencies..."
npm install --quiet

echo "🔨 Generating Prisma client..."
npm run db:generate --silent

echo "📊 Verifying Supabase connection..."
npm run verify:supabase

echo ""
echo "✅ Quick start complete!"
echo ""
echo "Next: npm run dev"
