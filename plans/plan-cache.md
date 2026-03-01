# Plan Implementasi Redis Cache

## 1. Install Dependencies
```bash
pnpm add ioredis
pnpm add -D @types/ioredis
```

## 2. Buat Redis Utility (`src/utils/redis.ts`)
- Inisialisasi client ioredis
- Konfigurasi dari environment variables (`REDIS_URL` / `REDIS_HOST`, `REDIS_PORT`)
- Export method: `get`, `set`, `del`, `setex`

## 3. Buat Cache Service (`src/services/cacheService.ts`)
- `cacheGet(key: string)` - ambil dari cache
- `cacheSet(key: string, data: any, ttlSeconds: number)` - simpan ke cache
- `cacheDelete(key: string)` - hapus cache
- `cacheDeletePattern(pattern: string)` - hapus banyak (untuk invalidation)

## 4. Update Al-Quran Controller (`src/controllers/alquranController.ts`)
- `getAlquran`: cache key `alquran:surah`, TTL 24 jam
- `getSurahByNumber`: cache key `alquran:surah:{nomor}`, TTL 24 jam
- `getAllJuz`: cache key `alquran:juz:list`, TTL 24 jam
- `getJuzById`: cache key `alquran:juz:{id}`, TTL 24 jam

## 5. Update Chart Controller (`src/controllers/chartController.ts`)
- `getChartHafalanController`: cache key `chart:{santriId}:{range}:{mode}`, TTL 5 menit
- Include user context dalam cache key

## 6. Tambahkan Environment Variables
```
REDIS_HOST=localhost
REDIS_PORT=6379
# atau
REDIS_URL=redis://localhost:6379
```

## 7. Update Docker Compose
```yaml
services:
  api:
    # ... existing config
    env_file:
      - .env
    depends_on:
      - redis
      - db
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```

## 8. Handle Cache Miss & Error
- Jika Redis down → fallback ke DB langsung (graceful degradation)
- Log warning saat cache error

---

## Struktur File Baru
```
src/
├── utils/
│   └── redis.ts          # Redis client initialization
├── services/
│   └── cacheService.ts   # Cache utility methods
```

---

## Cache TTL Reference

| Endpoint | Key Pattern | TTL |
|----------|-------------|-----|
| GET /api/alquran/surah | `alquran:surah` | 24 jam (86400s) |
| GET /api/alquran/surah/:nomor | `alquran:surah:{nomor}` | 24 jam (86400s) |
| GET /api/alquran/juz | `alquran:juz:list` | 24 jam (86400s) |
| GET /api/alquran/juz/:idjuz | `alquran:juz:{id}` | 24 jam (86400s) |
| GET /api/chart | `chart:{santriId}:{range}:{mode}` | 5 menit (300s) |
