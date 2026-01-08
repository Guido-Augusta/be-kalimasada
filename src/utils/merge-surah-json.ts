import * as fs from 'fs';
import * as path from 'path';

interface Ayat {
  nomorAyat: number;
  arab: string;
  latin: string;
  terjemah: string;
  juz: number;
}

interface Surat {
  nomor: number;
  nama: string;
  namaLatin: string;
  totalAyat: number;
  tempatTurun: string;
  arti: string;
  deskripsi: string;
  ayat: Ayat[];
}

async function gabungkanFileJson(): Promise<void> {
  const direktoriData: string = './data-surah';
  const fileOutput: string = 'alquran.json';
  const dataGabungan: Surat[] = [];

  try {
    console.log('Mulai proses penggabungan file JSON...');
    
    for (let i = 1; i <= 114; i++) {
      const namaFile: string = `surah-${i}.json`;
      const pathFile: string = path.join(direktoriData, namaFile);

      if (fs.existsSync(pathFile)) {
        const fileContent: string = await fs.promises.readFile(pathFile, { encoding: 'utf8' });
        const dataSurat: Surat[] = JSON.parse(fileContent);
        
        dataGabungan.push(...dataSurat);
        console.log(`✅ Berhasil membaca dan menambahkan ${namaFile}`);
      } else {
        console.warn(`⚠️ File ${namaFile} tidak ditemukan. Melewati...`);
      }
    }

    await fs.promises.writeFile(fileOutput, JSON.stringify(dataGabungan, null, 2), { encoding: 'utf8' });
    
    console.log(`\n🎉 Selesai! Berhasil menggabungkan 114 file ke dalam '${fileOutput}'`);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('❌ Terjadi kesalahan saat memproses file:', error.message);
    }
  }
}

// Menjalankan fungsi utama
gabungkanFileJson();