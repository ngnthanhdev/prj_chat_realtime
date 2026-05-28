#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created backend/.env from .env.example"
fi

echo "Starting Postgres via docker compose..."
docker compose up -d postgres

echo "Installing backend dependencies..."
npm install

echo "Generating Prisma client..."
npm run prisma:generate

echo "Running Prisma migration..."
npm run prisma:migrate -- --name init

echo "Seeding first admin..."
npm run seed:admin

echo "Backend setup complete. Start with: npm run start:dev"
