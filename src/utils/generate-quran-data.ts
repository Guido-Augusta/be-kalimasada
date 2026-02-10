import { error } from 'console';
import fs from 'fs';

interface AyatOutput {
  nomorAyat: number;
  arab: string;
  latin: string;
  terjemah: string;
  juz: number; 
}

interface SurahDataOutput {
  nomor: number;
  nama: string;
  namaLatin: string;
  totalAyat: number;
  tempatTurun: string;
  arti: string;
  deskripsi: string;
  ayat: AyatOutput[];
}

interface ApiResponseGadingDev {
  code: number;
  status: string;
  message: string;
  data: {
    number: number;
    numberOfVerses: number;
    name: {
      short: string;
      long: string;
      transliteration: {
        en: string;
        id: string;
      };
      translation: {
        en: string;
        id: string;
      };
    };
    revelation: {
      arab: string;
      en: string;
      id: string;
    };
    tafsir: {
      id: string;
    };
    preBismillah: null;
    verses: {
      number: {
        inQuran: number;
        inSurah: number;
      };
      meta: {
        juz: number;
        page: number;
      };
      text: {
        arab: string;
        transliteration: {
          en: string;
        };
      };
      translation: {
        en: string;
        id: string;
      };
    }[];
  };
}

async function processAndSaveSurah(number: number): Promise<void> {
  try {
    const url = `https://api.quran.gading.dev/surah/${number}`;
    const response = await fetch(url);
    const result: ApiResponseGadingDev = await response.json();

    if (result.code !== 200) {
      throw new Error(`Gagal mengambil data dari API.`);
    }

    const surahDataFromApi = result.data;

    const ayatFormatted: AyatOutput[] = surahDataFromApi.verses.map(ayat => ({
      nomorAyat: ayat.number.inSurah,
      arab: ayat.text.arab,
      latin: ayat.text.transliteration.en,
      terjemah: ayat.translation.id,
      juz: ayat.meta.juz,
      halaman: ayat.meta.page,
    }));

    const finalData: SurahDataOutput = {
      nomor: surahDataFromApi.number,
      nama: surahDataFromApi.name.short,
      namaLatin: surahDataFromApi.name.transliteration.id,
      totalAyat: surahDataFromApi.numberOfVerses,
      tempatTurun: surahDataFromApi.revelation.id,
      arti: surahDataFromApi.name.translation.id,
      deskripsi: surahDataFromApi.tafsir.id,
      ayat: ayatFormatted,
    };

    const jsonString = JSON.stringify([finalData], null, 2);
    const fileName = `surah-${finalData.nomor}.json`;
    fs.writeFileSync("./data-surah-page/" + fileName, jsonString);

    console.log(`✅ Data surah ${finalData.namaLatin} (${finalData.nama}) berhasil disimpan ke file ${fileName}.`);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(`❌ Terjadi kesalahan: ${error.message}`);
    }
  }
}

// Panggil fungsi untuk memulai proses
const surahListToProcess = Array.from({ length: 114 }, (_, i) => i + 1);

async function processAllSurahs() {
  for (const surahNumber of surahListToProcess) {
    await processAndSaveSurah(surahNumber);
  }
}

processAllSurahs();