#!/bin/bash

set -e

echo "🗃️  Setting up MenuCraft database..."

# Load environment variables
if [ ! -f ".env" ]; then
  echo "❌ .env file not found. Please run 'pnpm setup' first."
  exit 1
fi

# Export DATABASE_URL from .env for the commands
export $(grep -v '^#' .env | xargs)

# Check if database is accessible
if ! docker exec menucraft-db pg_isready -U menucraft -d menucraft > /dev/null 2>&1; then
  echo "❌ Database is not ready. Make sure Docker containers are running:"
  echo "   docker-compose up -d"
  exit 1
fi

echo "📋 Generating database migrations..."
pnpm --filter @menucraft/database db:generate

echo "🚀 Running database migrations..."
pnpm --filter @menucraft/database db:migrate

echo "✅ Database setup complete!"
echo ""
echo "Available database commands:"
echo "  🎯 Database Studio: pnpm db:studio"
echo "  🔄 Generate migrations: pnpm db:generate"
echo "  ⬆️  Run migrations: pnpm --filter @menucraft/database db:migrate"