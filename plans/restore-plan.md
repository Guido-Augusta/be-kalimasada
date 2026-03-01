# Plan Restore Database

## Overview

Dokumen ini berisi panduan lengkap untuk restore database PostgreSQL dari file backup.

## Prasyarat

- Docker sudah terinstall
- Container PostgreSQL (`db_tahfidz_kalimasada`) sudah running
- File backup berekstensi `.sql.gz`

---

## Skenario 1: Restore ke Container yang Sama (Same VPS)

### Langkah-langkah

```bash
# Step 1: Pastikan container running
docker ps | grep db

# Step 2: Cek file backup yang tersedia
ls -la backup/

# Step 3: Ekstrak dan restore (tanpa simpan file .sql)
gunzip -c backup_2026-03-03_00-00-00.sql.gz | docker exec -i db_tahfidz_kalimasada psql -U postgres db_tahfidz_app_dev

# Step 4: Verifikasi restore berhasil
docker exec db_tahfidz_kalimasada psql -U postgres db_tahfidz_app_dev -c "SELECT COUNT(*) FROM \"User\";"
```

### Alternatif (Simpan file .sql dulu)

```bash
# Ekstrak file
gunzip backup_2026-03-03_00-00-00.sql.gz

# Restore
docker exec -i db_tahfidz_kalimasada psql -U postgres db_tahfidz_app_dev < backup_2026-03-03_00-00-00.sql

# Cleanup file .sql (opsional)
rm backup_2026-03-03_00-00-00.sql
```

---

## Skenario 2: Restore ke Container Beda VPS (Different VPS)

### Skenario: Import backup dari VPS A ke VPS B

**Di VPS B (tujuan):**

```bash
# Step 1: Copy file backup dari VPS A ke VPS B
# Menggunakan SCP
scp user@VPS_A:/path/to/project/backup/backup_2026-03-03_00-00-00.sql.gz /tmp/

# ATAU download dari cloud storage
# wget https://storage.example.com/backup/backup_2026-03-03_00-00-00.sql.gz

# Step 2: Pastikan container PostgreSQL running
docker ps | grep db

# Step 3: Cek apakah database sudah ada
docker exec db_tahfidz_kalimasada psql -U postgres -l

# Step 4: Buat database jika belum ada
docker exec db_tahfidz_kalimasada psql -U postgres -c "CREATE DATABASE db_tahfidz_app_dev;"

# Step 5: Ekstrak dan restore
gunzip -c /tmp/backup_2026-03-03_00-00-00.sql.gz | docker exec -i db_tahfidz_kalimasada psql -U postgres db_tahfidz_app_dev

# Step 6: Verifikasi
docker exec db_tahfidz_kalimasada psql -U postgres db_tahfidz_app_dev -c "SELECT COUNT(*) FROM \"User\";"
```

---

## Skenario 3: Force Restore (Hapus Database Dulu)

Gunakan jika ingin database dalam kondisi sama persis dengan backup (clean restore):

```bash
# Step 1: Drop database
docker exec db_tahfidz_kalimasada psql -U postgres -c "DROP DATABASE IF EXISTS db_tahfidz_app_dev;"

# Step 2: Buat database baru
docker exec db_tahfidz_kalimasada psql -U postgres -c "CREATE DATABASE db_tahfidz_app_dev;"

# Step 3: Restore dari backup
gunzip -c backup_2026-03-03_00-00-00.sql.gz | docker exec -i db_tahfidz_kalimasada psql -U postgres db_tahfidz_app_dev
```

---

## Verifikasi Keberhasilan Restore

### Cek Jumlah Data Tabel Utama

```bash
docker exec db_tahfidz_kalimasada psql -U postgres db_tahfidz_app_dev -c "
  SELECT 'User' as table_name, COUNT(*) as total FROM \"User\"
  UNION ALL SELECT 'Santri', COUNT(*) FROM \"Santri\"
  UNION ALL SELECT 'Ustadz', COUNT(*) FROM \"Ustadz\"
  UNION ALL SELECT 'RiwayatHafalan', COUNT(*) FROM \"RiwayatHafalan\"
  UNION ALL SELECT 'Surah', COUNT(*) FROM \"Surah\"
  UNION ALL SELECT 'Ayat', COUNT(*) FROM \"Ayat\"
  ORDER BY table_name;
"
```

### Cek Schema Tabel

```bash
docker exec db_tahfidz_kalimasada psql -U postgres db_tahfidz_app_dev -c "\dt"
```

---

## Troubleshooting

### Error: Database does not exist

```bash
# Buat database dulu
docker exec db_tahfidz_kalimasada psql -U postgres -c "CREATE DATABASE db_tahfidz_app_dev;"
```

### Error: Permission denied

```bash
# Cek ownership database
docker exec db_tahfidz_kalimasada psql -U postgres -c "\l"
```

### Error: Table already exists

```bash
# Gunakan skenario 3 (force restore) atau
# Drop tabel sebelum restore
docker exec db_tahfidz_kalimasada psql -U postgres db_tahfidz_app_dev -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```

### Error: Invalid backup file

```bash
# Cek integritas file gzip
gzip -t backup_2026-03-03_00-00-00.sql.gz

# Jika error, file corrupt - gunakan backup lain
```

---

## Script Restore Otomatis

Buat file `scripts/restore.sh` di project root:

```bash
#!/bin/bash

# Usage: ./scripts/restore.sh backup_2026-03-03_00-00-00.sql.gz

BACKUP_FILE=$1
DB_NAME="db_tahfidz_app_dev"
CONTAINER="db_tahfidz_kalimasada"
POSTGRES_USER="postgres"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup_file.sql.gz>"
  echo "Example: $0 backup_2026-03-03_00-00-00.sql.gz"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: File $BACKUP_FILE not found!"
  exit 1
fi

echo "Starting restore from $BACKUP_FILE..."
echo "Container: $CONTAINER"
echo "Database: $DB_NAME"

# Restore
gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER" psql -U "$POSTGRES_USER" "$DB_NAME"

if [ $? -eq 0 ]; then
  echo "Restore completed successfully!"
  
  # Show summary
  echo ""
  echo "Data summary:"
  docker exec "$CONTAINER" psql -U "$POSTGRES_USER" "$DB_NAME" -c "
    SELECT 'User' as table_name, COUNT(*) as total FROM \"User\"
    UNION ALL SELECT 'Santri', COUNT(*) FROM \"Santri\"
    UNION ALL SELECT 'Ustadz', COUNT(*) FROM \"Ustadz\"
    ORDER BY table_name;
  "
else
  echo "Restore failed!"
  exit 1
fi
```

### Cara Pakai

```bash
# Beri permission execute
chmod +x scripts/restore.sh

# Jalankan restore
./scripts/restore.sh backup/backup_2026-03-03_00-00-00.sql.gz
```

---

## Checklist Restore

- [ ] File backup tersedia dan tidak corrupt
- [ ] Container PostgreSQL running
- [ ] Database target sudah dibuat
- [ ] Proses restore berhasil tanpa error
- [ ] Data terverifikasi (cek jumlah record)
- [ ] Aplikasi bisa terkoneksi ke database
- [ ] End-to-end test berhasil

---

## Catatan Keamanan

- **Backup file** berisi data sensitif - simpan di lokasi aman
- **Jangan pernah** restore ke production tanpa test di staging dulu
- **Backup dulu** database existing sebelum restore (jika diperlukan)
- Verifikasi **checksum** file backup sebelum restore jika ada

---

## Referensi Command pg_dump/pg_restore

| Command | Deskripsi |
|---------|-----------|
| `pg_dump -U postgres dbname > file.sql` | Dump tanpa compress |
| `pg_dump -U postgres dbname \| gzip > file.sql.gz` | Dump dengan compress |
| `gunzip -c file.sql.gz \| psql dbname` | Restore dari .gz |
| `psql dbname < file.sql` | Restore dari .sql |
