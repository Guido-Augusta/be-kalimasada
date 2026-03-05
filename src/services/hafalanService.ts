import { StatusHafalan } from '@prisma/client';
import { formatInTimeZone } from 'date-fns-tz';
import prisma from '../utils/prisma';
import {
  CreateManyHafalanPayload,
  HafalanRepository,
} from '../repositories/hafalanRepositories';
import { sendHafalanEmail } from '../utils/sendAccountEmail';

const JAKARTA_TIMEZONE = 'Asia/Jakarta';
const JAKARTA_OFFSET_HOURS = 7;

function formatDateToYMD(date: Date): string {
  return formatInTimeZone(date, JAKARTA_TIMEZONE, 'yyyy-MM-dd');
}

function getJakartaDateRange(tanggal: string): {
  startDate: Date;
  endDate: Date;
} {
  const baseDate = new Date(tanggal + 'T00:00:00.000Z');
  const offsetMs = JAKARTA_OFFSET_HOURS * 60 * 60 * 1000;
  const startDate = new Date(baseDate.getTime() - offsetMs);
  const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
  return { startDate, endDate };
}

export const HafalanService = {
  async getProgress(santriId: number, mode: string) {
    const santri = await HafalanRepository.getSantriById(santriId);
    const hafalan = await HafalanRepository.getHafalanSantri(santriId);
    const ayatSudah = new Set(hafalan.map((h) => h.ayatId));

    if (mode === 'surah') {
      const surahList = await HafalanRepository.getAllSurah();
      const result = await Promise.all(
        surahList.map(async (s) => {
          const totalSudah = await HafalanRepository.countAyatHafal(
            s.id,
            Array.from(ayatSudah)
          );
          return { ...s, progress: `${totalSudah}/${s.totalAyat}` };
        })
      );
      return { santri, data: result };
    } else {
      // mode === "juz"
      const juzList = await HafalanRepository.getAllJuz();
      const result = await Promise.all(
        juzList.map(async (j) => {
          const ayatInJuz = await HafalanRepository.getAyatByJuzWithSurah(
            j.juz as number
          );
          const totalAyat = ayatInJuz.length;
          const sudahHafal = ayatInJuz.filter((a) =>
            ayatSudah.has(a.id)
          ).length;
          const firstAyat = ayatInJuz[0];
          return {
            juz: j.juz,
            mulai_dari: firstAyat
              ? {
                  surah: {
                    nomor: firstAyat.surah.nomor,
                    nama: firstAyat.surah.nama,
                    nama_latin: firstAyat.surah.namaLatin,
                  },
                  ayat: firstAyat.nomorAyat,
                }
              : null,
            progress: `${sudahHafal}/${totalAyat}`,
            totalAyat,
          };
        })
      );
      return { santri, data: result };
    }
  },

  async getDetailHafalanSurah(santriId: number, surahId: number, mode: string) {
    const ayatSurah = await HafalanRepository.getAyatSurah(surahId);
    const hafalanSantri = await HafalanRepository.getHafalanBySurah(
      santriId,
      surahId,
      'TambahHafalan'
    );
    const surah = await HafalanRepository.getSurahById(surahId);

    const sudahHafal = new Set(hafalanSantri.map((h) => h.ayatId));

    const result =
      mode === 'tambah'
        ? ayatSurah.map((ayat) => ({
            ...ayat,
            checked: sudahHafal.has(ayat.id),
          }))
        : ayatSurah.map((ayat) => ({ ...ayat, checked: false }));

    return { surah, santriId, mode, ayat: result };
  },

  async getDetailHafalanJuz(santriId: number, juzId: number, mode: string) {
    const ayatJuz = await HafalanRepository.getAyatDetailByJuz(juzId);
    const ayatIds = ayatJuz.map((a) => a.id);
    const hafalanSantri = await HafalanRepository.getHafalanByAyatIds(
      santriId,
      ayatIds,
      'TambahHafalan'
    );

    const sudahHafal = new Set(hafalanSantri.map((h) => h.ayatId));

    // Group ayat by surah
    const surahMap = new Map();
    ayatJuz.forEach((ayat) => {
      const surahId = ayat.surah.id;
      if (!surahMap.has(surahId)) {
        surahMap.set(surahId, {
          surah: ayat.surah,
          ayat: [],
        });
      }
      surahMap.get(surahId).ayat.push({
        ...ayat,
        checked: mode === 'tambah' ? sudahHafal.has(ayat.id) : false,
      });
    });

    const surahList = Array.from(surahMap.values());

    return {
      juz: juzId,
      santriId,
      mode,
      totalSurah: surahList.length,
      surah: surahList,
    };
  },

  async simpanHafalan(
    santriId: number,
    ustadzId: number,
    ayatIds: number[],
    status: string,
    kualitas?: 'Kurang' | 'Cukup' | 'Baik' | 'SangatBaik',
    keterangan?: 'Mengulang' | 'Lanjut',
    catatan?: string
  ) {
    let sudahAdaAyatIds: number[] = [];
    let ayatBaruIds: number[] = ayatIds;

    if (status === 'TambahHafalan') {
      const exist = await HafalanRepository.findExistingHafalan(
        santriId,
        ayatIds
      );
      const sudahAda = new Set(exist.map((e) => e.ayatId));
      sudahAdaAyatIds = ayatIds.filter((id) => sudahAda.has(id));
      ayatBaruIds = ayatIds.filter((id) => !sudahAda.has(id));
    }

    // Get data santri
    const santri = await HafalanRepository.getSantriById(santriId);
    if (!santri) {
      throw new Error('Data santri tidak ditemukan.');
    }

    // Get all parents for the santri
    const orangTuaList =
      await HafalanRepository.getOrangTuaBySantriId(santriId);

    // Get detail ayat and surah untuk semua ayat yang diinput (untuk email)
    const detailAyat = await HafalanRepository.getAyatDetailByIds(ayatIds);

    // Check if detailAyat has elements before accessing
    if (detailAyat.length === 0) {
      throw new Error('Ayat yang disimpan tidak ditemukan.');
    }
    const surahInfo = await HafalanRepository.getSurahById(
      detailAyat[0].surahId
    );
    if (!surahInfo) {
      throw new Error('Informasi Surah tidak ditemukan.');
    }

    const poinPerAyat = status === 'TambahHafalan' && keterangan === 'Lanjut' ? 5 : 0;
    const totalPoinDidapat = ayatBaruIds.length * poinPerAyat;

    // Buat data untuk semua ayat yang diinput
    // Ayat baru mendapat poin, ayat yang sudah ada mendapat 0 poin
    const newHafalanData = ayatIds.map((ayatId) => ({
      santriId,
      ustadzId,
      ayatId,
      tanggalHafalan: new Date(),
      status,
      kualitas: status === 'TambahHafalan' ? kualitas : undefined,
      keterangan,
      catatan,
      poinDidapat: ayatBaruIds.includes(ayatId) ? poinPerAyat : 0,
    }));

    // Use transaction for TambahHafalan to be safe
    if (status === 'TambahHafalan') {
      await prisma.$transaction([
        HafalanRepository.createManyHafalan(
          newHafalanData as CreateManyHafalanPayload[]
        ),
        HafalanRepository.updateSantriTotalPoin(santriId, totalPoinDidapat),
      ]);
    } else {
      // For Murajaah, only save the record
      await HafalanRepository.createManyHafalan(
        newHafalanData as CreateManyHafalanPayload[]
      );
    }

    // Send email notification to each parent
    if (orangTuaList.length > 0) {
      for (const orangTua of orangTuaList) {
        if (orangTua.user?.email) {
          await sendHafalanEmail({
            ortuName: orangTua.nama,
            santriName: santri.nama,
            tanggalHafalan: new Date(),
            namaSurah: surahInfo.namaLatin,
            jumlahAyat: newHafalanData.length,
            ayatNomorList: detailAyat.map((ayat) => ayat.nomorAyat),
            status,
            kualitas,
            keterangan,
            catatan,
            emailOrtu: orangTua.user.email,
          });
        }
      }
    }

    // Return response
    if (status === 'TambahHafalan') {
      return {
        message: 'TambahHafalan berhasil disimpan',
        count: newHafalanData.length,
        dilewati: sudahAdaAyatIds.length,
        ayatBaru: ayatBaruIds.length,
        totalPoinDidapat: totalPoinDidapat,
      };
    } else {
      return {
        message: 'Murajaah berhasil disimpan',
        count: newHafalanData.length,
      };
    }
  },

  async simpanHafalanByHalaman(
    santriId: number,
    ustadzId: number,
    halamanAwal: number,
    halamanAkhir: number,
    status: string,
    kualitas?: 'Kurang' | 'Cukup' | 'Baik' | 'SangatBaik',
    keterangan?: 'Mengulang' | 'Lanjut',
    catatan?: string
  ) {
    // Get all ayat in the page range
    const ayatInRange = await HafalanRepository.getAyatByHalamanRange(
      halamanAwal,
      halamanAkhir
    );

    if (ayatInRange.length === 0) {
      throw new Error(
        `Tidak ada ayat ditemukan pada rentang halaman ${halamanAwal} - ${halamanAkhir}.`
      );
    }

    const ayatIds = ayatInRange.map((a) => a.id);

    let sudahAdaAyatIds: number[] = [];
    let ayatBaruIds: number[] = ayatIds;

    if (status === 'TambahHafalan') {
      const exist = await HafalanRepository.findExistingHafalan(
        santriId,
        ayatIds
      );
      const sudahAda = new Set(exist.map((e) => e.ayatId));
      sudahAdaAyatIds = ayatIds.filter((id) => sudahAda.has(id));
      ayatBaruIds = ayatIds.filter((id) => !sudahAda.has(id));
    }

    // Get data santri
    const santri = await HafalanRepository.getSantriById(santriId);
    if (!santri) {
      throw new Error('Data santri tidak ditemukan.');
    }

    // Get all parents for the santri
    const orangTuaList =
      await HafalanRepository.getOrangTuaBySantriId(santriId);

    // Get detail ayat untuk email
    const detailAyat = ayatInRange;

    // Get surah info dari ayat pertama
    const surahInfo = await HafalanRepository.getSurahById(
      detailAyat[0].surahId
    );
    if (!surahInfo) {
      throw new Error('Informasi Surah tidak ditemukan.');
    }

    const poinPerAyat = status === 'TambahHafalan' && keterangan === 'Lanjut' ? 5 : 0;
    const totalPoinDidapat = ayatBaruIds.length * poinPerAyat;

    // Buat data untuk semua ayat yang diinput
    const newHafalanData = ayatIds.map((ayatId) => ({
      santriId,
      ustadzId,
      ayatId,
      tanggalHafalan: new Date(),
      status,
      kualitas: status === 'TambahHafalan' ? kualitas : undefined,
      keterangan,
      catatan,
      poinDidapat: ayatBaruIds.includes(ayatId) ? poinPerAyat : 0,
    }));

    // Use transaction for TambahHafalan to be safe
    if (status === 'TambahHafalan') {
      await prisma.$transaction([
        HafalanRepository.createManyHafalan(
          newHafalanData as CreateManyHafalanPayload[]
        ),
        HafalanRepository.updateSantriTotalPoin(santriId, totalPoinDidapat),
      ]);
    } else {
      // For Murajaah, only save the record
      await HafalanRepository.createManyHafalan(
        newHafalanData as CreateManyHafalanPayload[]
      );
    }

    // Send email notification to each parent
    if (orangTuaList.length > 0) {
      for (const orangTua of orangTuaList) {
        if (orangTua.user?.email) {
          await sendHafalanEmail({
            ortuName: orangTua.nama,
            santriName: santri.nama,
            tanggalHafalan: new Date(),
            namaSurah: surahInfo.namaLatin,
            jumlahAyat: newHafalanData.length,
            ayatNomorList: detailAyat.map((ayat) => ayat.nomorAyat),
            status,
            catatan,
            emailOrtu: orangTua.user.email,
          });
        }
      }
    }

    // Return response
    if (status === 'TambahHafalan') {
      return {
        message: 'TambahHafalan berdasarkan halaman berhasil disimpan',
        count: newHafalanData.length,
        dilewati: sudahAdaAyatIds.length,
        ayatBaru: ayatBaruIds.length,
        totalPoinDidapat: totalPoinDidapat,
        halamanAwal,
        halamanAkhir,
      };
    } else {
      return {
        message: 'Murajaah berdasarkan halaman berhasil disimpan',
        count: newHafalanData.length,
        halamanAwal,
        halamanAkhir,
      };
    }
  },

  async getRiwayatHafalanBySantri(
    santriId: number,
    page: number,
    limit: number,
    sort: string,
    sortBy: string,
    status?: string,
    mode: string = 'ayat'
  ) {
    const santri = await HafalanRepository.getSantriById(santriId);
    if (!santri) {
      return { santri: null };
    }

    const riwayat = await HafalanRepository.getRiwayatHafalanBySantri(
      santriId,
      status
    );

    let allGroupedData: any[] = [];

    if (mode === 'halaman') {
      // Group by juz (pengelompokan: tanggal → juz)
      const groupedData: {
        [key: string]: {
          tanggal: string;
          status: string;
          juz: number;
          jumlahAyat: number;
          totalPoin: number;
          _ayatNumbers: number[];
          _halamanNumbers: number[];
          surahList: { id: number; nama: string; namaLatin: string }[];
        };
      } = {};

      riwayat.forEach((r) => {
        const tanggal = formatDateToYMD(r.tanggalHafalan);
        const status = r.status;
        const juz = r.ayat.juz || 0;
        const halaman = r.ayat.halaman || 0;
        const nomorAyat = r.ayat.nomorAyat;
        const surah = r.ayat.surah;

        const key = `${tanggal}-${status}-${juz}`;

        if (groupedData[key]) {
          groupedData[key].jumlahAyat += 1;
          groupedData[key].totalPoin += r.poinDidapat;
          groupedData[key]._ayatNumbers.push(nomorAyat);
          groupedData[key]._halamanNumbers.push(halaman);
          // Add unique surah to list
          if (!groupedData[key].surahList.find((s) => s.id === surah.id)) {
            groupedData[key].surahList.push(surah);
          }
        } else {
          groupedData[key] = {
            tanggal,
            status,
            juz,
            jumlahAyat: 1,
            totalPoin: r.poinDidapat,
            _ayatNumbers: [nomorAyat],
            _halamanNumbers: [halaman],
            surahList: [surah],
          };
        }
      });

      // Calculate rangeHalaman, totalHalaman and format for each group
      allGroupedData = Object.values(groupedData).map((group) => {
        const minHalaman = Math.min(...group._halamanNumbers);
        const maxHalaman = Math.max(...group._halamanNumbers);
        const uniqueHalaman = new Set(group._halamanNumbers);
        const { _ayatNumbers, _halamanNumbers, surahList, ...rest } = group;
        return {
          ...rest,
          totalHalaman: uniqueHalaman.size,
          rangeHalaman: { awal: minHalaman, akhir: maxHalaman },
          surah: surahList,
        };
      });
    } else {
      // Mode 'ayat' - Group by surah (existing behavior)
      const groupedData: {
        [key: string]: {
          tanggal: string;
          status: string;
          surahId: number;
          namaSurah: string;
          namaSurahLatin: string;
          jumlahAyat: number;
          totalPoin: number;
          rangeAyat: { awal: number; akhir: number };
          _ayatNumbers: number[];
        };
      } = {};

      riwayat.forEach((r) => {
        const tanggal = formatDateToYMD(r.tanggalHafalan);
        const status = r.status;
        const surahId = r.ayat.surah.id;
        const namaSurah = r.ayat.surah.nama;
        const namaSurahLatin = r.ayat.surah.namaLatin;
        const nomorAyat = r.ayat.nomorAyat;

        const key = `${tanggal}-${status}-${surahId}`;

        if (groupedData[key]) {
          groupedData[key].jumlahAyat += 1;
          groupedData[key].totalPoin += r.poinDidapat;
          groupedData[key]._ayatNumbers.push(nomorAyat);
        } else {
          groupedData[key] = {
            tanggal,
            status,
            surahId,
            namaSurah,
            namaSurahLatin,
            jumlahAyat: 1,
            totalPoin: r.poinDidapat,
            rangeAyat: { awal: nomorAyat, akhir: nomorAyat },
            _ayatNumbers: [nomorAyat],
          };
        }
      });

      // Calculate rangeAyat for each group
      Object.keys(groupedData).forEach((key) => {
        const group = groupedData[key];
        const minAyat = Math.min(...group._ayatNumbers);
        const maxAyat = Math.max(...group._ayatNumbers);
        group.rangeAyat = { awal: minAyat, akhir: maxAyat };
        delete (group as { _ayatNumbers?: number[] })._ayatNumbers;
      });

      allGroupedData = Object.values(groupedData);
    }

    if (sort && sortBy) {
      allGroupedData.sort((a, b) => {
        let valA, valB;

        if (sort === 'tanggal') {
          valA = new Date(a.tanggal).getTime();
          valB = new Date(b.tanggal).getTime();
        } else if (sort === 'status') {
          valA = a.status.toLowerCase();
          valB = b.status.toLowerCase();
        } else {
          return 0;
        }

        if (sortBy === 'asc') {
          return valA > valB ? 1 : -1;
        } else if (sortBy === 'desc') {
          return valA < valB ? 1 : -1;
        } else {
          return 0;
        }
      });
    }

    const skip = (page - 1) * limit;
    const paginatedResult = allGroupedData.slice(skip, skip + limit);

    const totalGroupedData = allGroupedData.length;
    const totalPages = Math.ceil(totalGroupedData / limit);

    return {
      santri,
      mode,
      pagination: {
        page,
        limit,
        totalData: totalGroupedData,
        totalPages,
      },
      data: paginatedResult,
    };
  },

  async deleteRiwayatHafalan(
    santriId: number,
    surahId: number | undefined,
    juzId: number | undefined,
    tanggal: string,
    status: string
  ) {
    let ayatIds: number[];

    if (surahId !== undefined) {
      const ayatInSurah = await HafalanRepository.getAyatIdsBySurahId(surahId);
      if (!ayatInSurah.length) {
        return {
          count: 0,
          message: 'Surah tidak ditemukan atau tidak memiliki ayat.',
        };
      }
      ayatIds = ayatInSurah.map((ayat) => ayat.id);
    } else if (juzId !== undefined) {
      const ayatInJuz = await HafalanRepository.getAyatByJuz(juzId);
      if (!ayatInJuz.length) {
        return {
          count: 0,
          message: 'Juz tidak ditemukan atau tidak memiliki ayat.',
        };
      }
      ayatIds = ayatInJuz.map((ayat) => ayat.id);
    } else {
      return { count: 0, message: 'SurahId atau juz harus diberikan.' };
    }

    let deletedCount = 0;

    if (status === 'TambahHafalan') {
      const poinData = await HafalanRepository.getPoinHafalanToDelete(
        santriId,
        ayatIds,
        tanggal,
        status
      );
      const totalPoinToDeduct = poinData._sum.poinDidapat || 0;

      const [deleteResult] = await prisma.$transaction([
        HafalanRepository.deleteHafalanByDateSurahStatus(
          santriId,
          ayatIds,
          tanggal,
          status
        ),
        HafalanRepository.updateSantriTotalPoin(santriId, -totalPoinToDeduct),
      ]);

      deletedCount = deleteResult.count;

      if (deletedCount === 0) {
        return { count: 0, message: 'Riwayat hafalan not found' };
      }

      return {
        count: deletedCount,
        message: `${deletedCount} riwayat hafalan on ${tanggal} success delete. Poin santri dikurangi sebesar ${totalPoinToDeduct}.`,
      };
    } else {
      const result = await HafalanRepository.deleteHafalanByDateSurahStatus(
        santriId,
        ayatIds,
        tanggal,
        status
      );

      deletedCount = result.count;
      if (deletedCount === 0) {
        return { count: 0, message: 'Riwayat hafalan not found' };
      }
      return {
        count: deletedCount,
        message: `${deletedCount} riwayat hafalan on ${tanggal} success delete. Tidak ada poin yang dikurangi.`,
      };
    }
  },

  async getRiwayatDetailByDateAndSurah(
    santriId: number,
    surahId: number,
    tanggal: string,
    status: string
  ) {
    const { startDate, endDate } = getJakartaDateRange(tanggal);

    const riwayat = await HafalanRepository.getDetailRiwayatAyat(
      santriId,
      surahId,
      startDate,
      endDate,
      status
    );

    if (!riwayat || riwayat.length === 0) {
      return null;
    }

    const firstItem = riwayat[0];
    const surahData = firstItem.ayat.surah;
    let totalPoin = 0;
    const ayatList = riwayat.map((item) => {
      totalPoin += item.poinDidapat;
      return {
        ...item.ayat,
        poinDidapat: item.poinDidapat,
      };
    });

    // Calculate range ayat
    const nomorAyatList = ayatList.map((ayat) => ayat.nomorAyat);
    const ayatAwal = Math.min(...nomorAyatList);
    const ayatAkhir = Math.max(...nomorAyatList);

    return {
      tanggal: tanggal,
      status: firstItem.status,
      ustadz: firstItem.ustadz,
      catatan: firstItem.catatan,
      totalPoin: totalPoin,
      rangeAyat: {
        awal: ayatAwal,
        akhir: ayatAkhir,
      },
      surah: {
        id: surahData.id,
        nama: surahData.nama,
        namaLatin: surahData.namaLatin,
      },
      daftarAyat: ayatList,
    };
  },

  async getRiwayatDetailByDateAndJuz(
    santriId: number,
    juzId: number,
    tanggal: string,
    status: string
  ) {
    const { startDate, endDate } = getJakartaDateRange(tanggal);

    const riwayat = await HafalanRepository.getDetailRiwayatAyatByJuz(
      santriId,
      juzId,
      startDate,
      endDate,
      status
    );

    if (!riwayat || riwayat.length === 0) {
      return null;
    }

    const firstItem = riwayat[0];
    let totalPoin = 0;
    const ayatList = riwayat.map((item) => {
      totalPoin += item.poinDidapat;
      return {
        ...item.ayat,
        poinDidapat: item.poinDidapat,
      };
    });

    // Calculate range ayat and halaman
    const nomorAyatList = ayatList.map((ayat) => ayat.nomorAyat);
    const ayatAwal = Math.min(...nomorAyatList);
    const ayatAkhir = Math.max(...nomorAyatList);

    const halamanList = ayatList
      .map((ayat) => ayat.halaman)
      .filter((h): h is number => h !== null && h !== undefined);
    const halamanAwal =
      halamanList.length > 0 ? Math.min(...halamanList) : null;
    const halamanAkhir =
      halamanList.length > 0 ? Math.max(...halamanList) : null;

    // Get unique surah list
    const surahMap = new Map();
    ayatList.forEach((ayat) => {
      if (!surahMap.has(ayat.surah.id)) {
        surahMap.set(ayat.surah.id, ayat.surah);
      }
    });
    const surahList = Array.from(surahMap.values());

    return {
      tanggal: tanggal,
      status: firstItem.status,
      ustadz: firstItem.ustadz,
      catatan: firstItem.catatan,
      totalPoin: totalPoin,
      juz: juzId,
      rangeAyat: {
        awal: ayatAwal,
        akhir: ayatAkhir,
      },
      rangeHalaman: {
        awal: halamanAwal,
        akhir: halamanAkhir,
      },
      surah: surahList,
      daftarAyat: ayatList,
    };
  },

  async getLatestHafalanAllSantri(
    page: number,
    limit: number,
    tahapHafalan?: string,
    status?: string,
    sortByAyat?: string,
    sortByHalaman?: string,
    name?: string,
    mode?: string
  ) {
    const totalData = await HafalanRepository.countAllSantri(
      tahapHafalan,
      name
    );
    const totalPages = Math.ceil(totalData / limit);
    const filterStatus = status || StatusHafalan.TambahHafalan;
    const modeParam = mode || 'surah';

    const santriWithHafalan =
      await HafalanRepository.getAllSantriWithLatestHafalan(
        tahapHafalan,
        filterStatus,
        name
      );

    const resultData = await Promise.all(
      santriWithHafalan.map(async (santri) => {
        const latestHafalan = santri.riwayatHafalan[0];
        let ayatTerakhirText: string | null = null;
        let ayatTerakhirNumber: number | null = null;
        let halamanTerakhirNumber: number | null = null;
        let hafalanInfo: {
          tanggal: string;
          status: StatusHafalan;
          surah?: string;
          surahId?: number;
          juz?: number;
          ayatDetail?: string | null;
          halamanDetail?: string | null;
          surahList?: { id: number; nama: string; namaLatin: string }[];
        } | null = null;

        if (latestHafalan && santri.riwayatHafalan.length > 0) {
          const tanggalHafalan = latestHafalan.tanggalHafalan;
          const statusHafalan = latestHafalan.status as StatusHafalan;

          if (modeParam === 'juz') {
            const latestDateStr = formatDateToYMD(tanggalHafalan);
            const riwayatOnLatestDate = santri.riwayatHafalan.filter(
              (riwayat: any) => {
                const riwayatDateStr = formatDateToYMD(
                  new Date(riwayat.tanggalHafalan)
                );
                return riwayatDateStr === latestDateStr;
              }
            );

            // Kelompokkan berdasarkan juz dari riwayat tanggal terakhir saja
            const juzGroups = new Map<
              number,
              { halaman: number; surah: any }[]
            >();
            const allSurahMap = new Map();

            riwayatOnLatestDate.forEach((riwayat: any) => {
              const juzNumber = riwayat.ayat.juz || 0;
              const halaman = riwayat.ayat.halaman;
              const surah = riwayat.ayat.surah;

              // Tambahkan ke grup juz
              if (!juzGroups.has(juzNumber)) {
                juzGroups.set(juzNumber, []);
              }
              juzGroups.get(juzNumber)?.push({ halaman, surah });

              // Tambahkan surah ke map (untuk unique list)
              if (!allSurahMap.has(surah.id)) {
                allSurahMap.set(surah.id, surah);
              }
            });

            // Ambil juz dengan jumlah ayat terbanyak (juz utama)
            let mainJuz = 0;
            let maxAyatCount = 0;
            juzGroups.forEach((ayatList, juzNum) => {
              if (ayatList.length > maxAyatCount) {
                maxAyatCount = ayatList.length;
                mainJuz = juzNum;
              }
            });

            const mainJuzData = juzGroups.get(mainJuz) || [];

            if (mainJuzData.length > 0) {
              const halamanNumbers = mainJuzData
                .map((a) => a.halaman)
                .filter((h): h is number => h !== null && h !== undefined);

              const surahList = Array.from(allSurahMap.values());

              // Halaman range dari juz utama
              let halamanDetail: string | null = null;
              if (halamanNumbers.length > 0) {
                const halamanMin = Math.min(...halamanNumbers);
                const halamanMax = Math.max(...halamanNumbers);
                halamanDetail =
                  halamanMin === halamanMax
                    ? `${halamanMin}`
                    : `${halamanMin} - ${halamanMax}`;
                halamanTerakhirNumber = halamanMax;
              }

              hafalanInfo = {
                tanggal: formatDateToYMD(tanggalHafalan),
                status: statusHafalan,
                juz: mainJuz,
                halamanDetail,
                surahList,
              };
            }
          } else {
            // Mode surah (default)
            const surahId = latestHafalan.ayat.surah.id;

            const groupedAyat =
              await HafalanRepository.getGroupedAyatByDateSurahStatus(
                santri.id,
                surahId,
                tanggalHafalan,
                statusHafalan
              );

            if (groupedAyat.length > 0) {
              const ayatNumbers = groupedAyat.map((a) => a.ayat.nomorAyat);
              const ayatMin = Math.min(...ayatNumbers);
              const ayatMax = Math.max(...ayatNumbers);

              // Always show range for both TambahHafalan and Murajaah
              ayatTerakhirText =
                ayatMin === ayatMax ? `${ayatMin}` : `${ayatMin} - ${ayatMax}`;
              ayatTerakhirNumber = ayatMax;
            }

            hafalanInfo = {
              tanggal: formatDateToYMD(tanggalHafalan),
              status: statusHafalan,
              surah: latestHafalan.ayat.surah.namaLatin,
              surahId: latestHafalan.ayat.surah.id,
              ayatDetail: ayatTerakhirText,
            };
          }
        }

        return {
          id: santri.id,
          nama: santri.nama,
          noInduk: santri.noInduk,
          tahapHafalan: santri.tahapHafalan,
          ayatTerakhirNumber,
          halamanTerakhirNumber,
          terakhirHafalan: hafalanInfo,
        };
      })
    );

    let sortedData = resultData;
    if (modeParam === 'juz' && sortByHalaman) {
      const isAsc = sortByHalaman === 'asc';

      sortedData.sort((a, b) => {
        const numA = a.halamanTerakhirNumber ?? 0;
        const numB = b.halamanTerakhirNumber ?? 0;

        if (numA === numB) {
          return isAsc
            ? (a.nama || '').localeCompare(b.nama || '')
            : (b.nama || '').localeCompare(a.nama || '');
        }

        return isAsc ? numA - numB : numB - numA;
      });
    } else if (modeParam === 'surah' && sortByAyat) {
      const isAsc = sortByAyat === 'asc';

      sortedData.sort((a, b) => {
        const numA = a.ayatTerakhirNumber ?? 0;
        const numB = b.ayatTerakhirNumber ?? 0;

        if (numA === numB) {
          return isAsc
            ? (a.nama || '').localeCompare(b.nama || '')
            : (b.nama || '').localeCompare(a.nama || '');
        }

        return isAsc ? numA - numB : numB - numA;
      });
    }

    const skip = (page - 1) * limit;
    const paginatedResult = sortedData.slice(skip, skip + limit);

    return {
      message: 'Riwayat hafalan terakhir semua santri berhasil diambil',
      mode: modeParam,
      pagination: {
        page,
        limit,
        totalData,
        totalPages,
        filter: {
          tahapHafalan,
          status: filterStatus,
          name,
        },
      },
      data: paginatedResult.map((item) => {
        const { ayatTerakhirNumber, halamanTerakhirNumber, ...rest } = item;
        return rest;
      }),
    };
  },
};
