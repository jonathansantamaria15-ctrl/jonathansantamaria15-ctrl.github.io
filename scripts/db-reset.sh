#!/usr/bin/env bash
# Recreates the local test database and applies the shim + real migrations.
# Used only for local RLS testing (see supabase/migrations for the real
# schema that ships to a real Supabase project).
set -euo pipefail

DB_NAME="${LOCAL_TEST_DB:-hosteleria_test}"

service postgresql start >/dev/null 2>&1 || true
sleep 1

sudo -u postgres psql -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS ${DB_NAME};" postgres
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${DB_NAME};" postgres

sudo -u postgres psql -v ON_ERROR_STOP=1 -d "${DB_NAME}" -f scripts/local-auth-shim.sql
for f in supabase/migrations/*.sql; do
  echo "Applying $f"
  sudo -u postgres psql -v ON_ERROR_STOP=1 -d "${DB_NAME}" -f "$f"
done

sudo -u postgres psql -v ON_ERROR_STOP=1 -d "${DB_NAME}" -f scripts/local-grants.sql

echo "Local test database '${DB_NAME}' ready."
