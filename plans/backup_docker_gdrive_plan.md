# Database Backup Strategy: Docker PostgreSQL to Google Drive

## Overview

This document outlines the backup strategy for the Tahfidz App PostgreSQL database. To ensure data safety, high availability, and minimal storage costs, the system uses an automated daily backup approach. 

The strategy involves taking a compressed SQL dump from the running Docker container, saving it locally, and immediately syncing it to a dedicated Google Drive folder using `rclone`.

## Architecture & Benefits
- **Automated Daily Backups:** Executed automatically via Linux OS Cron at 02:00 AM (off-peak hours).
- **Zero Downtime:** Uses `docker exec` to run `pg_dump` without stopping the database container.
- **Off-Site Storage:** Backups are instantly uploaded to Google Drive, ensuring data survival even if the VPS crashes completely (No Single Point of Failure).
- **Smart Retention (Local Storage Saver):** The script automatically deletes local backup files older than 7 days, preventing the VPS hard drive from filling up.

---

## Step-by-Step Implementation Guide

### Phase 1: Install and Configure `rclone` (Google Drive Integration)
`rclone` is the industry standard CLI tool for syncing files to cloud storage providers.

1. **Install rclone on the Host Server (Ubuntu/Debian):**
   ```bash
   sudo -v ; curl https://rclone.org/install.sh | sudo bash
   ```

2. **Configure rclone for Google Drive:**
   Run the interactive configuration wizard:
   ```bash
   rclone config
   ```
   Follow the prompts exactly as follows:
   - Press `n` to create a **New remote**.
   - Name the remote: Type `gdrive-tahfidz`.
   - Choose the storage type: Type `drive` (for Google Drive).
   - "Google Application Client Id" -> Leave blank (press Enter).
   - "Google Application Client Secret" -> Leave blank (press Enter).
   - "Scope that rclone should use" -> Press `1` (Full access all files).
   - "Service Account Credentials JSON" -> Leave blank (press Enter).
   - "Edit advanced config?" -> Press `n` (No).
   - "Use auto config?" -> Press `n` (No) *Since you are doing this on a headless VPS.*

3. **Authenticate via Browser (OOB):**
   - `rclone` will generate a long link. Copy this link and paste it into a browser on your local laptop.
   - Login to the Google account where you want to store the backups.
   - Click "Allow" to grant rclone access.
   - The browser will give you an **authorization code**.
   - Paste that code back into your VPS terminal.
   - "Configure this as a Shared Drive?" -> Press `n` (No).
   - Press `y` to confirm and save the configuration.

### Phase 2: Create the Backup Script
Create the bash script that will handle the dumping, compressing, and uploading process.

1. **Create the Script File:**
   ```bash
   sudo mkdir -p /opt/backups/tahfidz
   sudo nano /opt/backups/tahfidz/db_backup.sh
   ```

2. **Paste the Following Script:**
   *(Ensure you change the `CONTAINER_NAME` variable to match your actual PostgreSQL container name)*

   ```bash
   #!/bin/bash

   # ==========================================
   # TAHFIDZ APP: DOCKER TO GDRIVE BACKUP SCRIPT
   # ==========================================

   # 1. Configuration Variables
   # IMPORTANT: Change 'postgres-container' to your actual Docker container name
   CONTAINER_NAME="postgres-container" 
   DB_USER="postgres"
   DB_NAME="tahfidz_db"
   
   # Directory where local backups will be temporarily stored
   BACKUP_DIR="/opt/backups/tahfidz/archives"
   
   # Timestamp for the filename (Format: YYYY-MM-DD_HHMM)
   DATE=$(date +"%Y-%m-%d_%H%M")
   BACKUP_FILE="$BACKUP_DIR/db_backup_$DATE.sql.gz"
   
   # Rclone Remote Path (RemoteName:/FolderOnGDrive)
   RCLONE_REMOTE="gdrive-tahfidz:/Tahfidz_DB_Backups"

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
   ```

3. **Make the Script Executable:**
   ```bash
   sudo chmod +x /opt/backups/tahfidz/db_backup.sh
   ```

### Phase 3: Schedule the OS Cron Job
To ensure the script runs every day automatically, we add it to the Linux system `cron`.

1. **Open the Crontab Editor:**
   ```bash
   sudo crontab -e
   ```
   *(If asked to choose an editor, select `1` for nano).*

2. **Add the Cron Rule:**
   Scroll to the very bottom of the file and add this line:
   ```text
   0 2 * * * /bin/bash /opt/backups/tahfidz/db_backup.sh >> /var/log/tahfidz_backup.log 2>&1
   ```
   *Explanation of this rule:*
   - `0 2 * * *` = Run at exactly 02:00 AM every day.
   - `/bin/bash /opt/backups/...` = The path to execute our script.
   - `>> /var/log/tahfidz_backup.log` = Saves the "echo" outputs so we can check if it succeeded.
   - `2>&1` = Captures any error messages and writes them to the same log file.

3. **Save and Exit:**
   In Nano: Press `CTRL + O`, hit `Enter` to save, then press `CTRL + X` to exit.

---

## Operations & Verification

**How to test the backup right now:**
You don't need to wait until 2 AM to see if it works. Run the script manually:
```bash
sudo /opt/backups/tahfidz/db_backup.sh
```
Check your Google Drive folder named `Tahfidz_DB_Backups`. If the `.sql.gz` file is there, your setup is 100% successful.

**How to view backup logs:**
If you ever want to check the history of automated runs, view the log file:
```bash
cat /var/log/tahfidz_backup.log
```
