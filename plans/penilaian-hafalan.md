# Plan: Penambahan Skala Penilaian Hafalan

## Deskripsi
Menambahkan skala penilaian untuk Tambah Hafalan (kualitas + keterangan) dan Murajaah (keterangan saja) dengan logika poin yang berbeda-beda.

## Klarifikasi Requirements
- **Kualitas** (hanya TambahHafalan): Kurang, Cukup, Baik, SangatBaik
- **Keterangan**: Mengulang, Lanjut
- **Logika Poin**:
  - TambahHafalan + Lanjut = dapat poin (5 per ayat)
  - TambahHafalan + Mengulang = tidak dapat poin (0)
  - Murajaah + Lanjut/Mengulang = tidak dapat poin (0)
- Email notification perlu diupdate dengan info kualitas & keterangan

---

## Task List

### Phase 1: Database Schema
- [x] 1.1 Tambahkan enum `KualitasHafalan` di schema.prisma (Kurang, Cukup, Baik, SangatBaik)
- [x] 1.2 Tambahkan enum `KeteranganHafalan` di schema.prisma (Mengulang, Lanjut)
- [x] 1.3 Tambahkan field `kualitas` pada model `RiwayatHafalan` (nullable, hanya untuk TambahHafalan)
- [x] 1.4 Tambahkan field `keterangan` pada model `RiwayatHafalan` (nullable)
- [x] 1.5 Run `pnpm run migrate` untuk membuat migration
- [x] 1.6 Run `pnpm run generate` untuk generate Prisma client

### Phase 2: Validation
- [x] 2.1 Buat file `src/validation/hafalanValidation.ts`
- [x] 2.2 Buat schema untuk `simpanHafalan` (per ayat):
  - Jika `status = TambahHafalan`: wajib `kualitas` + wajib `keterangan`
  - Jika `status = Murajaah`: wajib `keterangan` saja
- [x] 2.3 Buat schema untuk `simpanHafalanByHalaman` (per halaman):
  - Same validation logic seperti di atas

### Phase 3: Controller Updates
- [x] 3.1 Update `simpanHafalan` di `src/controllers/hafalanController.ts`:
  - Import schema dari hafalanValidation
  - Replace manual validation dengan Zod schema
- [x] 3.2 Update `simpanHafalanByHalaman` di controller:
  - Import schema dari hafalanValidation
  - Replace manual validation dengan Zod schema

### Phase 4: Service Updates
- [x] 4.1 Update `simpanHafalan` di `src/services/hafalanService.ts`:
  - Tambahkan parameter `kualitas` dan `keterangan`
  - Update logika poin:
    - Jika TambahHafalan + Lanjut = 5 poin/ayat
    - Jika TambahHafalan + Mengulang = 0 poin
    - Jika Murajaah = 0 poin (default)
- [x] 4.2 Update `simpanHafalanByHalaman` di service:
  - Same logic seperti di atas

### Phase 5: Email Notification
- [x] 5.1 Update `src/utils/sendAccountEmail.ts`:
  - Tambahkan parameter `kualitas` dan `keterangan` di function
  - Update template email untuk menyertakan info kualitas dan keterangan
- [x] 5.2 Update `sendHafalanEmail` call di `hafalanService.ts`:
  - Tambahkan parameter `kualitas` dan `keterangan` saat memanggil email

### Phase 6: Testing & Verification
- [ ] 6.1 Build project: `pnpm run build`
- [ ] 6.2 Format code: `npx prettier --write .`
- [ ] 6.3 Test API endpoint TambahHafalan dengan berbagai kombinasi
- [ ] 6.4 Test API endpoint Murajaah dengan berbagai kombinasi

---

## Catatan
- **JANGAN** mengubah nama variabel yang sudah ada
- Field `catatan` tetap ada dan opsional (isi manual oleh user)
- Field `kualitas` hanya untuk TambahHafalan
- Field `keterangan` wajib untuk kedua jenis hafalan
