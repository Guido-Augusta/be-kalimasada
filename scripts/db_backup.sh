#!/bin/bash

# TAHFIDZ APP: DOCKER TO GDRIVE BACKUP SCRIPT

# 1. Configuration Variables
# Get script directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env"

# Load environment variables from .env file if it exists
if [ -f "$ENV_FILE" ]; then
    echo "Loading configuration from $ENV_FILE"
    # Export variables from .env, ignoring comments and empty lines
    # export $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs)
    set -o allexport
    source "$ENV_FILE"
    set +o allexport
else
    echo "Warning: .env file not found at $ENV_FILE. Using default/hardcoded values."
fi

# IMPORTANT: Set 'DB_CONTAINER_NAME' in your .env or fallback below
CONTAINER_NAME="${DB_CONTAINER_NAME:-db_tahfidz_kalimasada}" 
DB_USER="${POSTGRES_USER:-postgres}"
DB_NAME="${POSTGRES_DB:-tahfidz_db}"

# Directory where local backups will be temporarily stored
# This path should be accessible by the cron user on the host server
# BACKUP_DIR="${DB_BACKUP_DIR:-/opt/backups/tahfidz/archives}"
DB_BACKUP_DIR=/home/pengabdi/backups/tahfidz

# Timestamp for the filename (Format: YYYY-MM-DD_HHMM)
DATE=$(date +"%Y-%m-%d_%H%M")
BACKUP_FILE="$BACKUP_DIR/db_backup_$DATE.sql.gz"

# Rclone Remote Path (RemoteName:/FolderOnGDrive)
RCLONE_REMOTE="${DB_RCLONE_REMOTE:-gdrive-tahfidz:/Tahfidz_DB_Backups}"

# 2. Preparation
echo "Starting backup process at $(date)"
mkdir -p "$BACKUP_DIR"

# 3. Create dump inside Docker and GZIP on Host
echo "Dumping and compressing database..."
docker exec -t $CONTAINER_NAME pg_dump -U $DB_USER -d $DB_NAME -c | gzip > "$BACKUP_FILE"

# Check if docker exec was successful
if [ $? -eq 0 ]; then
    echo "Database dump successful: $BACKUP_FILE"
else
    echo "ERROR: Failed to dump the database. Exiting."
    exit 1
fi

# Secure the backup file
chmod 600 "$BACKUP_FILE"

# 4. Sync to Google Drive
echo "Uploading to Google Drive via rclone..."
rclone copy "$BACKUP_DIR" "$RCLONE_REMOTE"

if [ $? -eq 0 ]; then
    echo "Upload successful."
    
    # Clean up old remote backups (Keep only 7 days of history on Google Drive)
    echo "Cleaning up backups older than 7 days on Google Drive..."
    rclone delete "$RCLONE_REMOTE" --min-age 7d
else
    echo "ERROR: Failed to upload to Google Drive."
fi

# 5. Local Cleanup (Keep only 7 days locally)
echo "Cleaning up local files older than 7 days..."
# Find and delete files in BACKUP_DIR older than 7 days (-mtime +7)
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +7 -exec rm {} \;
echo "Local cleanup complete."

echo "Backup process finished successfully at $(date)!"
echo "---------------------------------------------------"
