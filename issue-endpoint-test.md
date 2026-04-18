# [BE] Implementasi Integration Testing untuk Seluruh Endpoint API

## Deskripsi

Issue ini bertujuan untuk memastikan stabilitas dan keandalan backend API melalui pembuatan **Integration Tests** (Pengujian Integrasi). Pengujian ini akan mensimulasikan pemanggilan HTTP ke semua _endpoint_ (Routes) yang tersedia, termasuk pengujian berbagai skenario _Query String_ (untuk filter, paginasi, sorting) dan _Route Parameters_ (ID).

Kita akan menggunakan **Vitest** (test runner yang sudah ada) dikombinasikan dengan **Supertest** untuk melakukan _HTTP assertions_.

## Daftar Pekerjaan

### 1. Setup Environment Pengujian

- **Instalasi Supertest**: Tambahkan `supertest` dan `@types/supertest` sebagai _dev dependency_.
- **Database Test**: Buat mekanisme _setup_ dan _teardown_ database khusus untuk testing agar pengujian berjalan di _environment_ yang terisolasi dan tidak merusak data _development_ atau _production_.
- **Auth Helper**: Buat utilitas pembantu (`test-utils/authHelper.ts`) untuk men-generate JWT Token palsu yang valid untuk tiap jenis _Role_ (`admin`, `ustadz`, `santri`, `ortu`) agar mempermudah pengujian endpoint yang dilindungi _middleware_.

### 2. Skenario Pengujian Endpoint (Target)

Buat file pengujian (misal: `*.api.test.ts` atau `*.int.test.ts`) untuk masing-masing modul berikut:

#### a. Modul Auth (`authRoutes.ts`)

- `POST /api/auth/login`: Test sukses (return token), salah password (401), user tidak ada (404).
- `POST /api/auth/logout/:id`: Test logout.
- `POST /api/auth/forgot-password`, `/verify-token`, `/reset-password`: Flow lupa password.
- `POST /api/auth/verify-old-password`, `/change-password`: Flow ganti password saat login.

#### b. Modul Santri (`santriRoutes.ts`)

- `GET /api/santri`: Test tanpa query (default paginasi), query paginasi (`?page=2&limit=5`), query filter/search.
- `GET /api/santri/:id` & `GET /api/santri/nama/:nama`: Test sukses (200), dan tidak ditemukan (404).
- `GET /api/santri/peringkat`: Test endpoint peringkat hafalan.
- `POST /api/santri`: Test validasi payload Zod (400), dan test sukses (201).
- `PUT /api/santri/:id` & `DELETE /api/santri/:id`: Test update dan delete.

#### c. Modul Ustadz & Ortu (`ustadzRoutes.ts`, `ortuRoutes.ts`)

- `GET`, `POST`, `PUT`, `DELETE` untuk entitas Ustadz dan Ortu (termasuk pencarian berdasarkan nama `/nama/:nama`).
- Pastikan endpoint upload `fotoProfil` (menggunakan `multer`) dites (opsional / mock jika menggunakan real file).

#### d. Modul Hafalan (`hafalanRoutes.ts`)

- `POST /api/hafalan/ayat` & `POST /api/hafalan/halaman`: Test simpan hafalan berdasarkan rentang ayat/halaman.
- `GET /api/hafalan/:santriId`, `/:santriId/surah/:surahId`, `/:santriId/juz/:juzId`: Test progress hafalan.
- `GET /api/hafalan/riwayat/:santriId`: Test riwayat hafalan dengan query parameter (status, page, limit, dll).
- `GET /api/hafalan/riwayat/detail/:santriId/surah/:surahId` & `.../juz/:juzId`.
- `DELETE /api/hafalan/riwayat`: Test hapus riwayat hafalan spesifik (dengan body/query yg sesuai).
- `GET /api/hafalan/all-santri/latest`: Test untuk mendapatkan riwayat hafalan terbaru seluruh santri.

#### e. Modul Al-Quran & Chart (`alquranRoutes.ts`, `chartRoutes.ts`)

- `GET /api/alquran/surah` & `/surah/:nomor`: List surah & detail surah.
- `GET /api/alquran/juz` & `/juz/:idjuz`: List juz & detail juz.
- `GET /api/chart`: Pastikan mengembalikan data statistik (JSON) yang benar sesuai `chartController`.

### 3. Aspek Penting dalam Setiap Test

Setiap _endpoint_ minimal diuji untuk:

1. **Happy Path**: Permintaan valid menghasilkan Status 200/201 dan format data yang benar.
2. **Error Validasi**: Permintaan dengan body/parameter/query yang salah harus ditangkap oleh Zod/Validation Layer dan menghasilkan Status 400.
3. **Error Not Found**: Memasukkan parameter `/:id` yang tidak eksis di DB menghasilkan Status 404.
4. **Autorisasi**: Jika _endpoint_ mensyaratkan token, pastikan permintaan tanpa token atau dengan role yang salah menghasilkan Status 401/403.

## Kriteria Penerimaan (Acceptance Criteria)

1. Semua rute di dalam folder `src/routes/` memiliki setidaknya satu file _integration test_.
2. Pengujian dapat dijalankan menggunakan perintah `pnpm test` dengan tingkat keberhasilan 100%.
3. Modifikasi/Penambahan database pada saat testing akan dibersihkan kembali secara otomatis (_database cleanup/teardown_).
