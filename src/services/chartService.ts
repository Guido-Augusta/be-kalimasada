import { eachDayOfInterval, format, subDays } from "date-fns";
import * as chartRepository from "../repositories/chartRepository";
export type ChartRange = "1w" | "1m" | "3m";

function getDaysFromRange(range: ChartRange): number {
  switch (range) {
    case "1w":
      return 7;
    case "1m":
      return 30;
    case "3m":
      return 90;
    default:
      throw new Error("Invalid range value");
  }
}

export async function getChartData(santriId: number, range: ChartRange, mode: string = "ayat") {
  const daysRange = getDaysFromRange(range);
  const endDate = new Date();
  const startDate = subDays(endDate, daysRange - 1);

  const hafalan = await chartRepository.getRiwayatHafalanByRange(santriId, daysRange);

  const dataPerTanggal: Record<string, { tambahHafalan: number; murajaah: number }> = {};
  
  if (mode === "halaman") {
    // Group by date and status, then count unique halaman
    const halamanPerTanggal: Record<string, { tambahHafalan: Set<number>; murajaah: Set<number> }> = {};
    
    hafalan.forEach((item) => {
      const tgl = format(item.tanggalHafalan, "yyyy-MM-dd");
      if (!halamanPerTanggal[tgl]) {
        halamanPerTanggal[tgl] = { tambahHafalan: new Set(), murajaah: new Set() };
      }
      if (item.ayat.halaman) {
        if (item.status === "TambahHafalan") {
          halamanPerTanggal[tgl].tambahHafalan.add(item.ayat.halaman);
        } else if (item.status === "Murajaah") {
          halamanPerTanggal[tgl].murajaah.add(item.ayat.halaman);
        }
      }
    });

    // Convert Sets to counts
    Object.keys(halamanPerTanggal).forEach((tgl) => {
      dataPerTanggal[tgl] = {
        tambahHafalan: halamanPerTanggal[tgl].tambahHafalan.size,
        murajaah: halamanPerTanggal[tgl].murajaah.size,
      };
    });
  } else {
    // Mode 'ayat' - count by ayat (existing behavior)
    hafalan.forEach((item) => {
      const tgl = format(item.tanggalHafalan, "yyyy-MM-dd");
      if (!dataPerTanggal[tgl]) {
        dataPerTanggal[tgl] = { tambahHafalan: 0, murajaah: 0 };
      }
      if (item.status === "TambahHafalan") {
        dataPerTanggal[tgl].tambahHafalan += 1;
      } else if (item.status === "Murajaah") {
        dataPerTanggal[tgl].murajaah += 1;
      }
    });
  }

  return eachDayOfInterval({ start: startDate, end: endDate }).map((tgl) => {
    const key = format(tgl, "yyyy-MM-dd");
    return {
      tanggal: key,
      tambahHafalan: dataPerTanggal[key]?.tambahHafalan || 0,
      murajaah: dataPerTanggal[key]?.murajaah || 0,
    };
  });
}