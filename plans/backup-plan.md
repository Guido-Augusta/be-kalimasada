# Plan Backup Database

## Overview

Dokumen ini berisi rencana backup database PostgreSQL untuk project Tahfidz App menggunakan Docker.

## Spesifikasi Project

| Item | Value |
|------|-------|
| **Database** | PostgreSQL 16 |
| **Container Name** | `db_tahfidz_kalimasada` |
| **Port** | 5432 (exposed ke host) |
| **Database Name** | `db_tahfidz_app_dev` |
| **User** | `postgres` |
| **Volume** | Docker volume `postgres_data` |

## Konfigurasi Environment

Tambahkan variabel berikut ke file `.env`:

```env
# Backup Configuration
BACKUP_DIR=./backup
BACKUP_RETENTION=3
```

## Metode Backup

Menggunakan `pg_dump` yang dijalankan melalui `docker exec` ke container PostgreSQL.

### Command Backup

```bash
docker exec db_tahfidz_kalimasada pg_dump -U postgres db_tahfidz_app_dev | gzip > ./backup/backup_$(date +\%Y-\%m-\%d_\%H-\%M-\%S).sql.gz
```

### Penjelasan:
- `docker exec` - Eksekusi command di dalam container
- `pg_dump` - Tool backup PostgreSQL
- `| gzip` - Kompress output menggunakan gzip
- `$(date +\%Y-\%m-\%d_\%H-\%M-\%S)` - Format timestamp

## Struktur File Backup

```
project-root/
├── backup/
│   ├── backup_2026-03-01_00-00-00.sql.gz
│   ├── backup_2026-03-02_00-00-00.sql.gz
│   └── backup_2026-03-03_00-00-00.sql.gz
├── src/
├── prisma/
└── ...
```

## Jadwal Backup

| Parameter | Value |
|-----------|-------|
| **Cron Expression** | `0 0 * * *` (Setiap tengah malam jam 00:00) |
| **Frequency** | 1x per hari |
| **Retention** | 3 file terakhir |

## Implementasi

### File Baru

Buat file: `src/cron/backupCron.ts`

Script akan melakukan:
1. Membuat folder backup jika belum ada
2. Menjalankan `pg_dump` via docker exec
3. Kompress output dengan gzip
4. Menyimpan dengan format filename: `backup_YYYY-MM-DD_HH-mm-ss.sql.gz`
5. Menghapus file backup lama (keep 3 file terakhir)

### Integrasi ke Main App

Import cron di `src/index.ts`:

```typescript
import './cron/backupCron';
```

## Catatan Penting

### Integritas Data
- Gzip memiliki **integrity check** - bisa verifikasi dengan: `gzip -t filename.sql.gz`
- Untuk memastikan backup valid, lakukan **test restore** secara berkala
- Selalu verifikasi ukuran file backup (tidak boleh 0 byte)

### Keamanan
- Simpan file backup di lokasi yang aman
- Pertimbangkan untuk encrypt backup jika berisi data sensitif
- Batasi akses ke folder backup

### Monitoring
- Tambahkan logging setiap proses backup
- Notifikasi jika backup gagal
- Monitor ukuran file backup (abnormal jika terlalu kecil/besar)

## Checklist Pre-Deployment

- [ ] Port PostgreSQL sudah di-expose (5432:5432)
- [ ] Folder backup sudah dibuat
- [ ] Variable BACKUP_DIR dan BACKUP_RETENTION ditambahkan ke .env
- [ ] Script backupCron.ts sudah dibuat
- [ ] Integrasi ke index.ts sudah dilakukan
- [ ] Test backup manual berhasil
- [ ] Test restore berhasil
- [ ] Cron schedule sudah berjalan

## Estimasi Ukuran Backup

| Data | Estimasi Size |
|------|---------------|
| Kosong (hanya schema) | ~50-100 KB |
| 1000 Santri + Riwayat | ~5-10 MB |
| 10000+ Santri | ~50-100 MB |

Ukuran aktual bergantung pada jumlah data di database.
