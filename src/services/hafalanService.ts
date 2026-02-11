import { StatusHafalan } from "@prisma/client";
import prisma from "../utils/prisma";
import { CreateManyHafalanPayload, HafalanRepository } from "../repositories/hafalanRepositories";
import { sendHafalanEmail } from "../utils/sendAccountEmail";

export const HafalanService = {
  async getSurahProgress(santriId: number) {
    const surahList = await HafalanRepository.getAllSurah();
    const hafalan = await HafalanRepository.getHafalanSantri(santriId);
    const santri = await HafalanRepository.getSantriById(santriId);

    const ayatSudah = new Set(hafalan.map((h) => h.ayatId));

    const result = await Promise.all(
      surahList.map(async (s) => {
        const totalSudah = await HafalanRepository.countAyatHafal(s.id, Array.from(ayatSudah));
        return { ...s, progress: `${totalSudah}/${s.totalAyat}` };
      })
    );

    return { santri, data: result };
  },

  async getDetailHafalanSurah(santriId: number, surahId: number, mode: string) {
    const ayatSurah = await HafalanRepository.getAyatSurah(surahId);
    const hafalanSantri = await HafalanRepository.getHafalanBySurah(santriId, surahId, "TambahHafalan");
    const surah = await HafalanRepository.getSurahById(surahId);

    const sudahHafal = new Set(hafalanSantri.map((h) => h.ayatId));

    const result =
      mode === "tambah"
        ? ayatSurah.map((ayat) => ({ ...ayat, checked: sudahHafal.has(ayat.id) }))
        : ayatSurah.map((ayat) => ({ ...ayat, checked: false }));

    return { surah, santriId, mode, ayat: result };
  },

  async simpanHafalan(santriId: number, ustadzId: number, ayatIds: number[], status: string, catatan?: string) {
    let sudahAdaAyatIds: number[] = [];
    let ayatBaruIds: number[] = ayatIds;
    
    if (status === "TambahHafalan") {
      const exist = await HafalanRepository.findExistingHafalan(santriId, ayatIds);
      const sudahAda = new Set(exist.map((e) => e.ayatId));
      sudahAdaAyatIds = ayatIds.filter((id) => sudahAda.has(id));
      ayatBaruIds = ayatIds.filter((id) => !sudahAda.has(id));
    }

    // Get data santri
    const santri = await HafalanRepository.getSantriById(santriId);
    if (!santri) {
        throw new Error("Data santri tidak ditemukan.");
    }

    // Get all parents for the santri
    const orangTuaList = await HafalanRepository.getOrangTuaBySantriId(santriId);
    
    // Get detail ayat and surah untuk semua ayat yang diinput (untuk email)
    const detailAyat = await HafalanRepository.getAyatDetailByIds(ayatIds);
    
    // Check if detailAyat has elements before accessing
    if (detailAyat.length === 0) {
        throw new Error("Ayat yang disimpan tidak ditemukan.");
    }
    const surahInfo = await HafalanRepository.getSurahById(detailAyat[0].surahId);
    if (!surahInfo) {
        throw new Error("Informasi Surah tidak ditemukan.");
    }
    
    const poinPerAyat = (status === "TambahHafalan") ? 5 : 0;
    const totalPoinDidapat = ayatBaruIds.length * poinPerAyat;

    // Buat data untuk semua ayat yang diinput
    // Ayat baru mendapat poin, ayat yang sudah ada mendapat 0 poin
    const newHafalanData = ayatIds.map((ayatId) => ({
      santriId,
      ustadzId,
      ayatId,
      tanggalHafalan: new Date(),
      status,
      catatan,
      poinDidapat: ayatBaruIds.includes(ayatId) ? poinPerAyat : 0,
    }));
    
    // Use transaction for TambahHafalan to be safe
    if (status === "TambahHafalan") {
      await prisma.$transaction([
        HafalanRepository.createManyHafalan(newHafalanData as CreateManyHafalanPayload[]),
        HafalanRepository.updateSantriTotalPoin(santriId, totalPoinDidapat),
      ]);
    } else {
      // For Murajaah, only save the record
      await HafalanRepository.createManyHafalan(newHafalanData as CreateManyHafalanPayload[]);
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
                  ayatNomorList: detailAyat.map(ayat => ayat.nomorAyat),
                  status,
                  catatan,
                  emailOrtu: orangTua.user.email,
              });
          }
      }
    }

    // Return response
    if (status === "TambahHafalan") {
      return { 
        message: "TambahHafalan berhasil disimpan", 
        count: newHafalanData.length, 
        dilewati: sudahAdaAyatIds.length,
        ayatBaru: ayatBaruIds.length,
        totalPoinDidapat: totalPoinDidapat
      };
    } else {
      return { 
        message: "Murajaah berhasil disimpan", 
        count: newHafalanData.length 
      };
    }
  },

  async getRiwayatHafalanBySantri(santriId: number, page: number, limit: number, sort: string, sortBy: string, status?: string) {
    const santri = await HafalanRepository.getSantriById(santriId);
    if (!santri) {
      return { santri: null };
    }

    const riwayat = await HafalanRepository.getRiwayatHafalanBySantri(santriId, status); 

    const groupedData: {
      [key: string]: {
        tanggal: string;
        status: string;
        surahId: number;
        namaSurah: string;
        namaSurahLatin: string;
        jumlahAyat: number;
        totalPoin: number;
      };
    } = {};

    riwayat.forEach((r) => {
      const tanggal = r.tanggalHafalan.toISOString().split("T")[0];
      const status = r.status;
      const surahId = r.ayat.surah.id;
      const namaSurah = r.ayat.surah.nama;
      const namaSurahLatin = r.ayat.surah.namaLatin;

      const key = `${tanggal}-${status}-${surahId}`;

      if (groupedData[key]) {
        groupedData[key].jumlahAyat += 1;
        groupedData[key].totalPoin += r.poinDidapat;
      } else {
        groupedData[key] = {
          tanggal,
          status,
          surahId,
          namaSurah,
          namaSurahLatin,
          jumlahAyat: 1,
          totalPoin: r.poinDidapat,
        };
      }
    });

    let allGroupedData = Object.values(groupedData);

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
      pagination: {
        page,
        limit,
        totalData: totalGroupedData,
        totalPages,
      },
      data: paginatedResult,
    };
  },

  async deleteRiwayatHafalan(santriId: number, surahId: number, tanggal: string, status: string) {
    const ayatInSurah = await HafalanRepository.getAyatIdsBySurahId(surahId);
    if (!ayatInSurah.length) {
      return { count: 0, message: "Surah tidak ditemukan atau tidak memiliki ayat." };
    }

    const ayatIdsInSurah = ayatInSurah.map((ayat) => ayat.id);
    let deletedCount = 0;
    
    if (status === "TambahHafalan") {
      const poinData = await HafalanRepository.getPoinHafalanToDelete(
        santriId,
        ayatIdsInSurah,
        tanggal,
        status
      );
      const totalPoinToDeduct = poinData._sum.poinDidapat || 0;

      const [deleteResult] = await prisma.$transaction([
        HafalanRepository.deleteHafalanByDateSurahStatus(santriId, ayatIdsInSurah, tanggal, status),
        HafalanRepository.updateSantriTotalPoin(santriId, -totalPoinToDeduct),
      ]);

      deletedCount = deleteResult.count;
      
      if (deletedCount === 0) {
        return { count: 0, message: "Riwayat hafalan not found" };
      }
      
      return {
        count: deletedCount,
        message: `${deletedCount} riwayat hafalan on ${tanggal} success delete. Poin santri dikurangi sebesar ${totalPoinToDeduct}.`,
      };
      
    } else {
      const result = await HafalanRepository.deleteHafalanByDateSurahStatus(
        santriId,
        ayatIdsInSurah,
        tanggal,
        status
      );

      deletedCount = result.count;
      if (deletedCount === 0) {
        return { count: 0, message: "Riwayat hafalan not found" };
      }
      return {
        count: deletedCount,
        message: `${deletedCount} riwayat hafalan on ${tanggal} success delete. Tidak ada poin yang dikurangi.`,
      };
    }
  },

  async getRiwayatDetailByDateAndSurah(santriId: number, surahId: number, tanggal: string, status: string) {
    const startDate = new Date(tanggal);
    const endDate = new Date(tanggal);
    endDate.setDate(endDate.getDate() + 1);

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
    const ayatList = riwayat.map(item => {
      totalPoin += item.poinDidapat;
      return {
          ...item.ayat,
          poinDidapat: item.poinDidapat,
      };
    });

    return {
      tanggal: tanggal,
      status: firstItem.status,
      ustadz: firstItem.ustadz,
      catatan: firstItem.catatan,
      totalPoin: totalPoin,
      surah: {
        id: surahData.id,
        nama: surahData.nama,
        namaLatin: surahData.namaLatin,
      },
      daftarAyat: ayatList,
    };
  },

  async getLatestHafalanAllSantri(page: number, limit: number, tahapHafalan?: string, status?: string, sortByAyat?: string, name?: string) {
    const totalData = await HafalanRepository.countAllSantri(tahapHafalan, name);
    const totalPages = Math.ceil(totalData / limit);
    const filterStatus = status || StatusHafalan.TambahHafalan; 

    const santriWithHafalan = await HafalanRepository.getAllSantriWithLatestHafalan(
      tahapHafalan,
      filterStatus,
      name
    );

    const resultData = await Promise.all(santriWithHafalan.map(async (santri) => {
      const latestHafalan = santri.riwayatHafalan[0];
      let ayatTerakhirText: string | null = null;
      let ayatTerakhirNumber: number | null = null;
      let hafalanInfo: {
        tanggal: string;
        status: StatusHafalan;
        surah: string;
        surahId: number;
        ayatDetail: string | null;
      } | null = null;
        
      if (latestHafalan) {
        const tanggalHafalan = latestHafalan.tanggalHafalan;
        const surahId = latestHafalan.ayat.surah.id;
        const statusHafalan = latestHafalan.status as StatusHafalan;
  
        const groupedAyat = await HafalanRepository.getGroupedAyatByDateSurahStatus(
          santri.id, surahId, tanggalHafalan, statusHafalan
        );
          
        if (groupedAyat.length > 0) {
          const ayatNumbers = groupedAyat.map(a => a.ayat.nomorAyat);
          const ayatMin = Math.min(...ayatNumbers);
          const ayatMax = Math.max(...ayatNumbers);
  
          if (statusHafalan === StatusHafalan.TambahHafalan) {
            ayatTerakhirText = `${ayatMax}`;
            ayatTerakhirNumber = ayatMax;
          } else if (statusHafalan === StatusHafalan.Murajaah) {
            ayatTerakhirText = (ayatMin === ayatMax) 
              ? `${ayatMin}`
              : `${ayatMin} - ${ayatMax}`;
          }
        }

        hafalanInfo = {
          tanggal: tanggalHafalan.toISOString().split("T")[0],
          status: statusHafalan,
          surah: latestHafalan.ayat.surah.namaLatin,
          surahId: latestHafalan.ayat.surah.id,
          ayatDetail: ayatTerakhirText,
        };
      }

      return {
        id: santri.id,
        nama: santri.nama,
        noInduk: santri.noInduk,
        tahapHafalan: santri.tahapHafalan,
        ayatTerakhirNumber,
        terakhirHafalan: hafalanInfo,
      };
    }));

    let sortedData = resultData;
    if (filterStatus === StatusHafalan.TambahHafalan && sortByAyat) {
        const isAsc = sortByAyat === 'asc';

        sortedData.sort((a, b) => {
          const numA = a.ayatTerakhirNumber ?? 0;
          const numB = b.ayatTerakhirNumber ?? 0;

          if (numA === numB) return 0;
            
          return isAsc ? numA - numB : numB - numA;
        });
    }

    const skip = (page - 1) * limit;
    const paginatedResult = sortedData.slice(skip, skip + limit);

    return {
      message: "Riwayat hafalan terakhir semua santri berhasil diambil",
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
      data: paginatedResult.map(item => {
        const { ayatTerakhirNumber, ...rest } = item;
        return rest;
      }),
    };
  },
};
