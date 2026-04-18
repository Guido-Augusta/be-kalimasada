import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { getAuthToken } from './test-utils/authHelper';
import { Role } from '@prisma/client';

describe('Santri API Integration Tests', () => {
  it('should get all santri with pagination', async () => {
    const token = await getAuthToken(Role.admin);
    const response = await request(app)
      .get('/api/santri?page=1&limit=5')
      .set('Authorization', `Bearer ${token}`)
      .set('x-platform', 'web');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('pagination');
  });

  it('should get santri peringkat', async () => {
    const token = await getAuthToken(Role.admin);
    const response = await request(app)
      .get('/api/santri/peringkat')
      .set('Authorization', `Bearer ${token}`)
      .set('x-platform', 'web');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('should fail to create santri as non-admin', async () => {
    const token = await getAuthToken(Role.santri);
    const response = await request(app)
      .post('/api/santri')
      .set('Authorization', `Bearer ${token}`)
      .set('x-platform', 'web')
      .send({
        nama: 'New Santri',
        password: 'password123',
        tahapHafalan: 'Level1',
        orangTuaId: 1
      });

    expect(response.status).toBe(403);
  });

  it('should return 401 for unauthorized access', async () => {
    const response = await request(app)
      .get('/api/santri')
      .set('x-platform', 'web');
    expect(response.status).toBe(401);
  });
});
