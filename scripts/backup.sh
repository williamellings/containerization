#!/bin/sh
# Tar en SQL-dump från db-containern: ./scripts/backup.sh
set -e
mkdir -p backups
FILE="backups/todo-$(date +%Y%m%d-%H%M%S).sql"
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > "$FILE"
echo "Backup sparad: $FILE"
