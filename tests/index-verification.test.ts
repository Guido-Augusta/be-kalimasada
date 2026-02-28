import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '../src/utils/prisma';

describe('Index Verification Tests', () => {
  beforeAll(async () => {
    // Wait for database connection
    await prisma.$connect();
  });

  describe('Verify Composite Indexes on RiwayatHafalan', () => {
    it('should have index on (santriId, status, tanggalHafalan)', async () => {
      const result = await prisma.$queryRaw<Array<{ indexname: string }>>`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'RiwayatHafalan' 
        AND indexname LIKE '%santriId%status%tanggalHafalan%'
      `;

      expect(result.length).toBeGreaterThan(0);
      console.log('✅ Index found:', result[0]?.indexname);
    });

    it('should have index on (santriId, status, ayatId)', async () => {
      const result = await prisma.$queryRaw<Array<{ indexname: string }>>`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'RiwayatHafalan' 
        AND indexname LIKE '%santriId%status%ayatId%'
      `;

      expect(result.length).toBeGreaterThan(0);
      console.log('✅ Index found:', result[0]?.indexname);
    });
  });

  describe('Query Performance Tests', () => {
    it('should query riwayat hafalan efficiently', async () => {
      const start = performance.now();
      
      await prisma.riwayatHafalan.findMany({
        where: {
          santriId: 1,
          status: 'TambahHafalan',
        },
        take: 10,
      });

      const end = performance.now();
      const duration = end - start;
      
      console.log(`⏱️ Query riwayat hafalan: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should query hafalan by surah efficiently', async () => {
      const start = performance.now();
      
      await prisma.riwayatHafalan.findMany({
        where: {
          santriId: 1,
          status: 'TambahHafalan',
          ayat: { surahId: 1 },
        },
        take: 10,
      });

      const end = performance.now();
      const duration = end - start;
      
      console.log(`⏱️ Query hafalan by surah: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(1000);
    });

    it('should check existing hafalan efficiently', async () => {
      const start = performance.now();
      
      await prisma.riwayatHafalan.findMany({
        where: {
          santriId: 1,
          status: 'TambahHafalan',
          ayatId: { in: [1, 2, 3] },
        },
        select: { ayatId: true },
      });

      const end = performance.now();
      const duration = end - start;
      
      console.log(`⏱️ Check existing hafalan: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Data Integrity Tests', () => {
    it('should have StatusHafalan enum with correct values', async () => {
      const statusEnum = await prisma.$queryRaw<Array<{ enumlabel: string }>>`
        SELECT enumlabel 
        FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'StatusHafalan')
      `;

      const labels = statusEnum.map(s => s.enumlabel);
      expect(labels).toContain('TambahHafalan');
      expect(labels).toContain('Murajaah');
      console.log('✅ StatusHafalan values:', labels);
    });
  });
});
