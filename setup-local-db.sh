#!/bin/bash

# POS Server - Local PostgreSQL Database Setup Script
# This script will set up a local PostgreSQL database using Docker

set -e

echo "========================================="
echo "POS Server - Local Database Setup"
echo "========================================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Error: Docker is not running!"
  echo "Please start Docker Desktop and try again."
  exit 1
fi

echo "✅ Docker is running"
echo ""

# Start PostgreSQL container
echo "🐘 Starting PostgreSQL container..."
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# Check if postgres container is healthy
until docker exec cpos-postgres pg_isready -U postgres > /dev/null 2>&1; do
  echo "⏳ Waiting for PostgreSQL to accept connections..."
  sleep 2
done

echo "✅ PostgreSQL is ready!"
echo ""

# Apply Prisma migrations
echo "📋 Applying database schema (Prisma migrations)..."
npx prisma migrate deploy

echo "✅ Schema applied successfully!"
echo ""

# Seed the database
echo "🌱 Seeding database with initial data..."
npx prisma db seed

echo "✅ Database seeded successfully!"
echo ""

# Show connection info
echo "========================================="
echo "✅ Setup Complete!"
echo "========================================="
echo ""
echo "Database Connection Details:"
echo "  Host:     localhost"
echo "  Port:     5432"
echo "  Database: cpos"
echo "  Username: postgres"
echo "  Password: postgres"
echo ""
echo "Connection String:"
echo "  postgresql://postgres:postgres@localhost:5432/cpos"
echo ""
echo "Optional: Start pgAdmin for database management:"
echo "  docker-compose up -d pgadmin"
echo "  Access at: http://localhost:5050"
echo "  Email: admin@cpos.local"
echo "  Password: admin"
echo ""
echo "Start the server with:"
echo "  npm run dev"
echo ""
echo "========================================="
