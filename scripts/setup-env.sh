#!/bin/bash

# Script to setup environment files from examples
# This script copies .env.example files to .env files

set -e

echo "🚀 Setting up environment files..."

# Backend
if [ -f "packages/backend/env.example" ]; then
  if [ ! -f "packages/backend/.env" ]; then
    cp packages/backend/env.example packages/backend/.env
    echo "✅ Created packages/backend/.env"
  else
    echo "⚠️  packages/backend/.env already exists, skipping..."
  fi
else
  echo "❌ packages/backend/env.example not found"
fi

# Frontend
if [ -f "packages/frontend/env.example" ]; then
  if [ ! -f "packages/frontend/.env" ]; then
    cp packages/frontend/env.example packages/frontend/.env
    echo "✅ Created packages/frontend/.env"
  else
    echo "⚠️  packages/frontend/.env already exists, skipping..."
  fi
else
  echo "❌ packages/frontend/env.example not found"
fi

# Frontend .env.local
if [ -f "packages/frontend/env.example" ]; then
  if [ ! -f "packages/frontend/.env.local" ]; then
    cp packages/frontend/env.example packages/frontend/.env.local
    echo "✅ Created packages/frontend/.env.local"
  else
    echo "⚠️  packages/frontend/.env.local already exists, skipping..."
  fi
fi

echo "✨ Environment setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Review and update the .env files if needed"
echo "   2. For production, update with your actual credentials"
echo "   3. Never commit .env files to version control"
