import { eachDayOfInterval, subDays } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import * as chartRepository from '../repositories/chartRepository';

const JAKARTA_TZ = 'Asia/Jakarta';
export type ChartRange = '1w' | '1m' | '3m';

function getDaysFromRange(range: ChartRange): number {
  switch (range) {
    case '1w':
      return 7;
    case '1m':
      return 30;
    case '3m':
      return 90;
    default:
      throw new Error('Invalid range value');
  }
}

export async function getChartData(
  santriId: number,
  range: ChartRange,
  mode: string = 'ayat'
) {
  const daysRange = getDaysFromRange(range);
  const endDate = new Date();
  const startDate = subDays(endDate, daysRange - 1);

  const hafalan = await chartRepository.getRiwayatHafalanByRange(
    santriId,
    daysRange
  );

  const dataPerTanggal: Record<
    string,
    { tambahHafalan: number; murajaah: number; tahsin: number }
  > = {};

  if (mode === 'halaman') {
    // Group by date and status, then count unique halaman
    const halamanPerTanggal: Record<
      string,
      { tambahHafalan: Set<number>; murajaah: Set<number>; tahsin: Set<number> }
    > = {};

    hafalan.forEach((item) => {
      const tgl = formatInTimeZone(
        item.tanggalHafalan,
        JAKARTA_TZ,
        'yyyy-MM-dd'
      );
      if (!halamanPerTanggal[tgl]) {
        halamanPerTanggal[tgl] = {
          tambahHafalan: new Set(),
          murajaah: new Set(),
          tahsin: new Set(),
        };
      }
      if (item.ayat.halaman) {
        if (item.status === 'TambahHafalan') {
          halamanPerTanggal[tgl].tambahHafalan.add(item.ayat.halaman);
        } else if (item.status === 'Murajaah') {
          halamanPerTanggal[tgl].murajaah.add(item.ayat.halaman);
        } else if (item.status === 'Tahsin') {
          halamanPerTanggal[tgl].tahsin.add(item.ayat.halaman);
        }
      }
    });

    // Convert Sets to counts
    Object.keys(halamanPerTanggal).forEach((tgl) => {
      dataPerTanggal[tgl] = {
        tambahHafalan: halamanPerTanggal[tgl].tambahHafalan.size,
        murajaah: halamanPerTanggal[tgl].murajaah.size,
        tahsin: halamanPerTanggal[tgl].tahsin.size,
      };
    });
  } else {
    const ayatPerTanggal: Record<
      string,
      { tambahHafalan: Set<number>; murajaah: Set<number>; tahsin: Set<number> }
    > = {};

    hafalan.forEach((item) => {
      const tgl = formatInTimeZone(
        item.tanggalHafalan,
        JAKARTA_TZ,
        'yyyy-MM-dd'
      );
      if (!ayatPerTanggal[tgl]) {
        ayatPerTanggal[tgl] = {
          tambahHafalan: new Set(),
          murajaah: new Set(),
          tahsin: new Set(),
        };
      }
      if (item.status === 'TambahHafalan') {
        ayatPerTanggal[tgl].tambahHafalan.add(item.ayatId);
      } else if (item.status === 'Murajaah') {
        ayatPerTanggal[tgl].murajaah.add(item.ayatId);
      } else if (item.status === 'Tahsin') {
        ayatPerTanggal[tgl].tahsin.add(item.ayatId);
      }
    });

    Object.keys(ayatPerTanggal).forEach((tgl) => {
      dataPerTanggal[tgl] = {
        tambahHafalan: ayatPerTanggal[tgl].tambahHafalan.size,
        murajaah: ayatPerTanggal[tgl].murajaah.size,
        tahsin: ayatPerTanggal[tgl].tahsin.size,
      };
    });
  }

  return eachDayOfInterval({ start: startDate, end: endDate }).map((tgl) => {
    const key = formatInTimeZone(tgl, JAKARTA_TZ, 'yyyy-MM-dd');
    return {
      tanggal: key,
      tambahHafalan: dataPerTanggal[key]?.tambahHafalan || 0,
      murajaah: dataPerTanggal[key]?.murajaah || 0,
      tahsin: dataPerTanggal[key]?.tahsin || 0,
    };
  });
}
