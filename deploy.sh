#!/bin/bash
# Railway Deployment Helper Script

echo "🚀 Tsunami Alert Backend - Railway Deployment Script"
echo "======================================================"
echo ""

# Navigate to backend
cd /Users/kamran/Major-Project/tsunami-alert-backend
echo "📍 Current directory: $(pwd)"
echo ""

# Check git status
echo "📋 Checking git status..."
git status
echo ""

# Stage all changes
echo "📦 Staging files..."
git add -A
echo "✓ Files staged"
echo ""

# Check what's staged
echo "📄 Staged files:"
git diff --cached --name-only
echo ""

# Commit changes
echo "💾 Committing changes..."
git commit -m "Fix Railway deployment: npm ci → npm install, add config files"
echo "✓ Commit successful"
echo ""

# Verify remote
echo "🔗 Git remotes:"
git remote -v
echo ""

# Get current branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "🌿 Current branch: $BRANCH"
echo ""

# Push with verbose output
echo "🚀 Pushing to GitHub..."
echo "Command: git push -v origin $BRANCH"
echo ""
git push -v origin $BRANCH

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ SUCCESS! Changes pushed to GitHub"
  echo ""
  echo "Next steps:"
  echo "1. Wait 2-3 minutes for Railway to detect the push"
  echo "2. Check Railway Dashboard for build progress"
  echo "3. Watch the deployment logs"
  echo ""
  echo "Expected in logs:"
  echo "  ✓ RUN npm install"
  echo "  ✓ RUN npm run build"  
  echo "  ✓ Build successful"
else
  echo ""
  echo "❌ Push failed with exit code $?"
  echo ""
  echo "Troubleshooting:"
  echo "1. Check GitHub credentials"
  echo "2. Verify you have internet connection"
  echo "3. Try: git config --list | grep remote"
  echo ""
fi
