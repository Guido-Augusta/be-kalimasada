import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';

describe('Common API Integration Tests (Alquran & Chart)', () => {
  it('should get all surah', async () => {
    const response = await request(app).get('/api/alquran/surah');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
  }, 60000);

  it('should get detail surah 1', async () => {
    const response = await request(app).get('/api/alquran/surah/1');
    expect(response.status).toBe(200);
    expect(response.body.nama_latin).toBe('Al-Fatihah');
  });

  it('should fetch Juz 1 with correct structure', async () => {
    const response = await request(app).get('/api/alquran/juz/1');

    expect(response.status).toBe(200);
    expect(response.body.data.juz).toBe(1);
    expect(response.body.data.ayat).toBeDefined();

    const firstAyat = response.body.data.ayat[0];
    expect(firstAyat.surah.nama_latin).toBe('Al-Fatihah');
    expect(firstAyat.nomor_ayat).toBe(1);
  });
});
