import fs from "fs";

const FILE_PATH = "./data-surah-page/alquran.json";

const raw = fs.readFileSync(FILE_PATH, "utf-8");
const surahList = JSON.parse(raw);

console.log("JUMLAH SURAH");
console.log("----------------");
console.log("Total Surah:", surahList.length);

console.log("\nJUMLAH AYAT PER SURAH");
console.log("------------------------");

let totalAyatQuran = 0;
const mismatch:any = [];

for (const surah of surahList) {
  const jumlahAyat = surah.ayat.length;
  totalAyatQuran += jumlahAyat;

  const valid = jumlahAyat === surah.totalAyat;

  if (!valid) {
    mismatch.push({
      nomor: surah.nomor,
      namaLatin: surah.namaLatin,
      totalAyatDiField: surah.totalAyat,
      jumlahAyatDiArray: jumlahAyat,
    });
  }

  console.log(
    `Surah ${String(surah.nomor).padStart(3, "0")} | ${
      surah.namaLatin
    } | ${jumlahAyat} ayat ${valid ? "✅" : "❌"}`
  );
}

console.log("\nRINGKASAN");
console.log("-------------");
console.log("Total Surah      :", surahList.length);
console.log("Total Ayat Quran :", totalAyatQuran);

if (mismatch.length > 0) {
  console.log("\nDATA TIDAK SESUAI");
  console.table(mismatch);
} else {
  console.log("\nSemua surah valid (totalAyat sesuai).");
}
