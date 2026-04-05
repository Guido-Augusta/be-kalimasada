# Database Backup Strategy: Docker PostgreSQL to Google Drive

## Overview

This document outlines the backup strategy for the Tahfidz App PostgreSQL database. To ensure data safety, high availability, and minimal storage costs, the system uses an automated daily backup approach.

The strategy involves taking a compressed SQL dump from the running Docker container, saving it locally, and immediately syncing it to a dedicated Google Drive folder using `rclone`.

## Architecture & Benefits
- **Automated Daily Backups:** Executed automatically via Linux OS Cron at 02:00 AM (off-peak hours).
- **Zero Downtime:** Uses `docker exec` to run `pg_dump` without stopping the database container.
- **Off-Site Storage:** Backups are instantly uploaded to Google Drive, ensuring data survival even if the VPS crashes completely (No Single Point of Failure).
- **Smart Retention (Local Storage Saver):** The script automatically deletes local backup files older than 7 days, preventing the VPS hard drive from filling up.
- **Environment-Aware:** The script reads configuration values (container name, DB credentials, rclone remote) directly from the project's `.env` file.

---

## Project Script Location

The backup script **already exists** inside the repository at:

```
be-kalimasada/
├── src/                  ← Application source code
├── scripts/
│   └── db_backup.sh      ← Backup script lives here
├── prisma/
├── .env
└── ...
```

When deployed to the VPS, the full path to the script would be something like:
```
/home/pengabdi/be-kalimasada/scripts/db_backup.sh
```

> **Note:** The script auto-detects its own directory using `BASH_SOURCE[0]`, then walks one level up to find the project root and load the `.env` file automatically. You do **not** need to hardcode any paths inside the script itself.

---

## Required `.env` Variables

The script reads the following variables from the project's `.env` file. Make sure they are set correctly on the VPS:

| Variable | Description | Example Value |
|---|---|---|
| `DB_CONTAINER_NAME` | Name of the running PostgreSQL Docker container | `db_tahfidz_kalimasada` |
| `POSTGRES_USER` | PostgreSQL superuser name | `postgres` |
| `POSTGRES_DB` | Database name to back up | `tahfidz_db` |
| `DB_RCLONE_REMOTE` | rclone remote path for Google Drive | `gdrive-tahfidz:/Tahfidz_DB_Backups` |

If any variable is missing from `.env`, the script falls back to sensible hardcoded defaults.

---

## Step-by-Step Implementation Guide

### Phase 1: Install and Configure `rclone` (Google Drive Integration)

`rclone` is the industry-standard CLI tool for syncing files to cloud storage providers.

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
   - "Google Application Client Id" → Leave blank (press Enter).
   - "Google Application Client Secret" → Leave blank (press Enter).
   - "Scope that rclone should use" → Press `1` (Full access all files).
   - "Service Account Credentials JSON" → Leave blank (press Enter).
   - "Edit advanced config?" → Press `n` (No).
   - "Use auto config?" → Press `n` (No) — *Since you are doing this on a headless VPS.*

3. **Authenticate via Browser (OOB):**
   - `rclone` will generate a long link. Copy this link and paste it into a browser on your local laptop.
   - Log in to the Google account where you want to store the backups.
   - Click "Allow" to grant rclone access.
   - The browser will give you an **authorization code**.
   - Paste that code back into your VPS terminal.
   - "Configure this as a Shared Drive?" → Press `n` (No).
   - Press `y` to confirm and save the configuration.

4. **Verify rclone is configured correctly:**
   ```bash
   rclone listremotes
   # Expected output: gdrive-tahfidz:

   rclone lsd gdrive-tahfidz:/
   # Expected output: lists folders on the root of your Google Drive
   ```

### Phase 2: Prepare the Script on the VPS

The script already exists in the repository. After cloning/pulling the project on the VPS, you only need to make it executable.

1. **Navigate to the scripts directory:**
   ```bash
   cd /home/pengabdi/be-kalimasada/scripts
   ```

2. **Make the script executable:**
   ```bash
   chmod +x db_backup.sh
   ```

3. **Ensure the local backup directory exists** (the script creates it automatically, but you can pre-create it):
   ```bash
   mkdir -p /home/pengabdi/backups/tahfidz
   ```

### Phase 3: Schedule the OS Cron Job

To run the backup every day automatically, add it to the Linux system `cron`.

1. **Open the Crontab Editor for the deployment user:**
   ```bash
   crontab -e
   ```
   *(If asked to choose an editor, select `1` for nano).*

2. **Add the Cron Rule:**
   Scroll to the very bottom of the file and add this line:
   ```text
   0 2 * * * /bin/bash /home/pengabdi/be-kalimasada/scripts/db_backup.sh >> /var/log/tahfidz_backup.log 2>&1
   ```
   *Explanation of this rule:*
   - `0 2 * * *` → Run at exactly 02:00 AM every day.
   - `/bin/bash /home/pengabdi/...` → The full path to execute the script.
   - `>> /var/log/tahfidz_backup.log` → Appends all `echo` outputs to a log file so we can audit runs.
   - `2>&1` → Captures any error messages and writes them to the same log file.

3. **Save and Exit:**
   In Nano: Press `CTRL + O`, hit `Enter` to save, then press `CTRL + X` to exit.

4. **Confirm the cron entry was saved:**
   ```bash
   crontab -l
   # You should see the line you just added printed here
   ```

---

## Operations & Verification

### How to Verify the Script Runs Successfully

You don't need to wait until 2 AM to confirm everything works. Run the script manually as the deployment user:

```bash
/bin/bash /home/pengabdi/be-kalimasada/scripts/db_backup.sh
```

Watch the terminal output. A fully successful run produces output similar to:
```
Loading configuration from /home/pengabdi/be-kalimasada/.env
Starting backup process at Mon Jan 01 02:00:00 WIB 2025
Dumping and compressing database...
Database dump successful: /home/pengabdi/backups/tahfidz/db_backup_2025-01-01_0200.sql.gz
Uploading to Google Drive via rclone...
Upload successful.
Cleaning up backups older than 7 days on Google Drive...
Cleaning up local files older than 7 days...
Local cleanup complete.
Backup process finished successfully at Mon Jan 01 02:00:01 WIB 2025!
---------------------------------------------------
```

**Checklist to confirm success:**
1. ✅ No `ERROR:` lines appear in the terminal output.
2. ✅ A `.sql.gz` file exists in `/home/pengabdi/backups/tahfidz/`:
   ```bash
   ls -lh /home/pengabdi/backups/tahfidz/
   ```
3. ✅ The file appears in your Google Drive folder `Tahfidz_DB_Backups`. You can also verify remotely from the VPS:
   ```bash
   rclone ls gdrive-tahfidz:/Tahfidz_DB_Backups
   ```
4. ✅ The `.sql.gz` file is not empty (size should be several KB or more):
   ```bash
   # A valid compressed dump is never 0 bytes
   ls -lh /home/pengabdi/backups/tahfidz/db_backup_*.sql.gz
   ```

### How to View Backup Logs

After the cron job has run at least once automatically, check the log file to audit the run history:

```bash
cat /var/log/tahfidz_backup.log
```

To watch the log in real-time during a manual test run:
```bash
tail -f /var/log/tahfidz_backup.log
```

---

## Testing Whether the Cron Job Is Running

Even if you added the cron entry with `crontab -e`, you should verify the cron daemon actually picked it up and is scheduling it.

### 1. Confirm the Cron Entry Exists
```bash
crontab -l
```
You should see your backup line in the output. If the output is empty or the line is missing, the entry was not saved — go back and re-add it.

### 2. Check the Cron Service Status
The cron daemon must be running for any cron job to execute:
```bash
# On most Ubuntu/Debian systems (service is named 'cron')
sudo systemctl status cron

# On some systems (e.g., CentOS/RHEL/Fedora) it may be named 'crond'
sudo systemctl status crond
```
The output should show `Active: active (running)`. If it shows `inactive` or `failed`, start it:
```bash
sudo systemctl start cron
sudo systemctl enable cron   # Ensures it starts automatically on reboot
```

### 3. Do a Forced Test Run at a Nearby Time
Rather than waiting until 2 AM, temporarily change the cron rule to run 2 minutes from now, save it, wait, then check the log:

```bash
crontab -e
# Change the time part to: (current minute + 2) (current hour) * * *
# Example: if it's currently 14:35, set it to: 37 14 * * *
```
After 2 minutes, check the log:
```bash
cat /var/log/tahfidz_backup.log
```
Once confirmed, revert the time back to `0 2 * * *`.

### 4. Check the System Cron Log
The system also logs cron activity. You can confirm cron triggered your job:
```bash
# Ubuntu/Debian (syslog-based)
grep CRON /var/log/syslog | tail -20

# Systems using journald
sudo journalctl -u cron --since "1 hour ago"
```
A successful trigger looks like:
```
Jan 01 02:00:01 hostname CRON[12345]: (pengabdi) CMD (/bin/bash /home/pengabdi/be-kalimasada/scripts/db_backup.sh >> /var/log/tahfidz_backup.log 2>&1)
```

---

## Troubleshooting: Cron Job Not Running Despite Being Set

If `crontab -l` shows the entry but the script never runs, work through these checks in order.

### Problem 1: Cron Daemon Is Not Running
```bash
sudo systemctl status cron
```
If not running:
```bash
sudo systemctl start cron && sudo systemctl enable cron
```

### Problem 2: Wrong User's Crontab
There is an important distinction between **user crontab** and **root crontab**:

- `crontab -e` edits the **current user's** cron (e.g., `pengabdi`).
- `sudo crontab -e` edits the **root user's** cron — a completely separate file.

If you added the job with `sudo crontab -e` but are checking with `crontab -l` (no sudo), you won't see it. Always be consistent. Check both:
```bash
crontab -l           # Current user's cron
sudo crontab -l      # Root's cron
```
Pick one and be consistent. Using the deployment user's crontab (without `sudo`) is recommended since Docker is accessible to that user.

### Problem 3: `docker` Command Not Found in Cron's PATH
Cron runs with a very minimal `PATH` (typically `/usr/bin:/bin`). The `docker` binary is often installed in `/usr/local/bin`, which is not included by default.

**Fix:** Explicitly export the full PATH at the top of your crontab:
```bash
crontab -e
```
Add this line at the very top of the crontab file (before any job entries):
```text
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
```
Then your job line follows below it. Alternatively, add it inside the script itself at the top:
```bash
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
```

To find out where `docker` is installed on your system:
```bash
which docker
# e.g.: /usr/bin/docker  or  /usr/local/bin/docker
```

### Problem 4: `rclone` Command Not Found in Cron's PATH
Same issue as above. Check where rclone is installed:
```bash
which rclone
# e.g.: /usr/bin/rclone
```
Make sure that directory is included in the `PATH` exported in your crontab or script.

### Problem 5: Log File Permission Denied
If `/var/log/tahfidz_backup.log` cannot be written by the non-root user, the cron job will silently fail. Fix by pre-creating the file with the correct ownership:
```bash
sudo touch /var/log/tahfidz_backup.log
sudo chown pengabdi:pengabdi /var/log/tahfidz_backup.log
```
Or redirect the log to a location the user owns, such as the home directory:
```text
0 2 * * * /bin/bash /home/pengabdi/be-kalimasada/scripts/db_backup.sh >> /home/pengabdi/tahfidz_backup.log 2>&1
```

### Problem 6: `.env` File Not Found
The script looks for `.env` at `../env` relative to the script's own directory. If the project is deployed to a different path than expected, confirm the project root is where you think it is:
```bash
ls /home/pengabdi/be-kalimasada/.env
```
If the `.env` file is missing, create it with at minimum:
```text
DB_CONTAINER_NAME=db_tahfidz_kalimasada
POSTGRES_USER=postgres
POSTGRES_DB=tahfidz_db
DB_RCLONE_REMOTE=gdrive-tahfidz:/Tahfidz_DB_Backups
```

### Problem 7: Script Has No Execute Permission
If the file permission was lost (e.g., after a fresh `git pull`), re-apply it:
```bash
chmod +x /home/pengabdi/be-kalimasada/scripts/db_backup.sh
```

### Quick Diagnostic Checklist

| # | Check | Command |
|---|---|---|
| 1 | Cron entry exists | `crontab -l` |
| 2 | Cron service is running | `sudo systemctl status cron` |
| 3 | Script is executable | `ls -l .../scripts/db_backup.sh` |
| 4 | Docker is reachable | `docker ps` |
| 5 | rclone is configured | `rclone listremotes` |
| 6 | PATH includes docker & rclone | `which docker && which rclone` |
| 7 | Log file is writable | `touch /var/log/tahfidz_backup.log` |
| 8 | Manual run works | `/bin/bash .../scripts/db_backup.sh` |

---

## Quick Reference

```bash
# Run backup manually
/bin/bash /home/pengabdi/be-kalimasada/scripts/db_backup.sh

# View backup logs
cat /var/log/tahfidz_backup.log

# List cron jobs for current user
crontab -l

# Check cron service status
sudo systemctl status cron

# Verify backup files locally
ls -lh /home/pengabdi/backups/tahfidz/

# Verify backup files on Google Drive
rclone ls gdrive-tahfidz:/Tahfidz_DB_Backups
```
