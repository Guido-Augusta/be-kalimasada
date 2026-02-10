import { PrismaClient } from '@prisma/client';
import surahData from './data/alquran-v2.json';

const prisma = new PrismaClient();
const url = process.env.NODE_ENV === "production" ? process.env.PROD_URL : process.env.DEV_URL;

async function main() {
  console.log('Mulai seeding data...');

  for (const surah of surahData) {
    const nomorStr = String(surah.nomor).padStart(3, '0');
    // const audioUrl = `${url}/audio/${nomorStr}.mp3`;
    const audioUrl = `https://santrikoding.com/storage/audio/${nomorStr}.mp3`

    // Upsert Surah
    const newSurah = await prisma.surah.upsert({
      where: { nomor: surah.nomor },
      update: {
        audio: audioUrl
      },
      create: {
        nomor: surah.nomor,
        nama: surah.nama,
        namaLatin: surah.namaLatin,
        totalAyat: surah.totalAyat,
        tempatTurun: surah.tempatTurun as 'Makkiyyah' | 'Madaniyyah',
        arti: surah.arti,
        deskripsi: surah.deskripsi,
        audio: audioUrl,
        },
    });

    console.log(`Surat ${newSurah.nama} (${newSurah.nomor}) berhasil di-seed.`);

    for (const ayat of surah.ayat) {
      await prisma.ayat.upsert({
        where: {
          surahId_nomorAyat: {
            surahId: newSurah.id,
            nomorAyat: ayat.nomorAyat,
          },
        },
        update: {},
        create: {
          surahId: newSurah.id,
          nomorAyat: ayat.nomorAyat,
          arab: ayat.arab,
          latin: ayat.latin,
          terjemah: ayat.terjemah,
          juz: ayat.juz,
          halaman: ayat.halaman
        },
      });
    }

    console.log(`  - ${surah.ayat.length} ayat dari surat ${surah.nama} berhasil di-seed.`);
  }

  console.log('Proses seeding selesai ✅');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
