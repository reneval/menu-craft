#!/bin/bash

set -e

echo "🚀 Setting up MenuCraft development environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running. Please start Docker and try again."
  exit 1
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
  echo "❌ pnpm is not installed. Please install pnpm first:"
  echo "   npm install -g pnpm"
  exit 1
fi

echo "📦 Installing dependencies..."
pnpm install

echo "🐳 Starting Docker containers..."
docker-compose up -d

echo "⏳ Waiting for database to be ready..."
sleep 10

# Check if database is healthy
max_attempts=30
attempt=1
while [ $attempt -le $max_attempts ]; do
  if docker exec menucraft-db pg_isready -U menucraft -d menucraft > /dev/null 2>&1; then
    echo "✅ Database is ready!"
    break
  fi

  if [ $attempt -eq $max_attempts ]; then
    echo "❌ Database failed to start after $max_attempts attempts"
    exit 1
  fi

  echo "⏳ Waiting for database... (attempt $attempt/$max_attempts)"
  sleep 2
  ((attempt++))
done

echo "📋 Setting up environment variables..."
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "✅ Copied .env.example to .env"
  echo "⚠️  Please edit .env file with your actual API keys for Clerk, Stripe, etc."
else
  echo "✅ .env file already exists"
fi

echo "🗃️  Setting up database..."
./scripts/db-setup.sh

echo "🎉 Setup complete!"
echo ""
echo "To start development:"
echo "  pnpm dev"
echo ""
echo "Available URLs:"
echo "  🌐 Web Dashboard: http://localhost:5173"
echo "  🚀 API Server: http://localhost:3000"
echo "  📚 API Docs: http://localhost:3000/docs"
echo "  🗄️  Database Studio: pnpm db:studio"
echo ""
echo "⚠️  Don't forget to configure your API keys in .env file!"