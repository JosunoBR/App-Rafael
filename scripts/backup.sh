#!/usr/bin/env bash
BACKUP_DIR="/var/www/app-rafael/backend/data/backups"
mkdir -p "$BACKUP_DIR"
cp /var/www/app-rafael/backend/data/mega12.db "$BACKUP_DIR/mega12_$(date +%Y-%m-%d).db"
find "$BACKUP_DIR" -name "mega12_*.db" -mtime +30 -delete
