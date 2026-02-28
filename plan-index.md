# Plan: Index Optimization untuk Table RiwayatHafalan

## 1. Latar Belakang

Table `RiwayatHafalan` menyimpan data hafalan/santri dengan dua status:
- `TambahHafalan` - Hafalan baru
- `Murajaah` - Review/Ulang

Seiring bertambahnya user, query akan melambat tanpa index yang tepat.

---

## 2. Target

Optimasi query performance untuk:
- API Riwayat Hafalan by Santri
- API Detail Hafalan per Surah
- API Check Existing Hafalan
- Chart/Reporting

---

## 3. Perubahan Schema

### File: `prisma/schema.prisma`

Tambahkan 2 composite index pada model `RiwayatHafalan`:

```prisma
model RiwayatHafalan {
  id             Int            @id @default(autoincrement())
  santriId        Int
  ustadzId       Int?
  ayatId         Int
  tanggalHafalan DateTime
  status         StatusHafalan
  catatan        String?
  poinDidapat    Int            @default(0)
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  // ... relations ...

  @@index([santriId, status, tanggalHafalan])
  @@index([santriId, status, ayatId])
}
```

### Index yang Ditambahkan

| Index | Column | Untuk Query |
|-------|--------|-------------|
| 1 | `(santriId, status, tanggalHafalan)` | Riwayat hafalan, detail by date |
| 2 | `(santriId, status, ayatId)` | Check existing, hafalan by surah |

---

## 4. Query yang Dioptimasi

| No | Repository Function | WHERE Clause | Index Digunakan |
|----|---------------------|--------------|-----------------|
| 1 | `getRiwayatHafalanBySantri` | `santriId, status` | Index 1 |
| 2 | `getHafalanByAyatIds` | `santriId, status, ayatId[]` | Index 2 |
| 3 | `getHafalanBySurah` | `santriId, status, surahId` | Index 2 |
| 4 | `getDetailRiwayatAyat` | `santriId, status, tanggal, surahId` | Index 1 |
| 5 | `getGroupedAyatByDateSurahStatus` | `santriId, status, tanggal, surahId` | Index 1 |
| 6 | `getAllAyatByDateAndStatus` | `santriId, status, tanggal` | Index 1 |
| 7 | `findExistingHafalan` | `santriId, status, ayatId[]` | Index 2 |

---

## 5. Langkah Implementation

### Step 1: Update Schema
- [x] Edit file `prisma/schema.prisma`, tambahkan 2 index pada model `RiwayatHafalan`.

### Step 2: Generate Prisma Client
- [x] Run `pnpm run generate`

### Step 3: Create Migration
- [x] Run `pnpm run migrate`

### Step 4: Verify Index
- [x] Login ke PostgreSQL dan cek index

### Step 5: Testing
- [x] Test API endpoints:
  - [x] Index verification tests passed
  - [x] Query performance tests passed

---

## 6. Estimated Impact

| Query Type | Before | After (Estimated) |
|------------|--------|-------------------|
| Riwayat Hafalan | Full table scan | Index scan |
| Detail per Surah | Full table scan | Index scan |
| Check Existing | Full table scan | Index scan |

---

## 7. Rollback Plan

Jika ada issue, bisa revert migration:
```bash
pnpm migrate rollback
```

---

## 8. Tambahan (Future)

Jika di masa depan perlu tambah status baru (Tahsin):
- Tinggal tambahkan ke enum `StatusHafalan`
- Index yang sudah ada tetap berfungsi

```prisma
enum StatusHafalan {
  TambahHafalan
  Murajaah
  Tahsin  // mudah tambah di sini
}
```

---

## 9. Approval

- [x] Schema sudah di-review
- [x] Index sudah dipahami dampaknya
- [x] Ready untuk implementasi

---

## Catatan

- **Duplicate Prevention**: Tidak perlu diubah - sudah ada application-level check untuk TambahHafalan
- **Murajaah/Tahsin**: Boleh input berkali-kali sesuai requirement
