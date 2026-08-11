#!/bin/sh
set -e

echo "Health Tracker API starting..."
node dist/migrate.js
echo "Starting server on port ${PORT:-5000}..."
exec node dist/index.js
