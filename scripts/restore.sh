#!/bin/sh
# Återställ från dump: ./scripts/restore.sh backups/todo-XXXX.sql
set -e
[ -n "$1" ] || { echo "Ange sökväg till .sql-fil"; exit 1; }
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB" -c "DROP TABLE IF EXISTS todos;"'
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"' < "$1"
echo "Återställt från $1"
