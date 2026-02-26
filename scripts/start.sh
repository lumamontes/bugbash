#!/bin/sh
set -e

echo "Running database migrations..."
node scripts/migrate.mjs
echo "Migrations complete. Starting server..."
exec node dist/server/entry.mjs
