import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';

describe('Auth API Integration Tests', () => {
  it('should verify database state', async () => {
    const { prisma } = await import('../src/utils/prisma');
    const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
    console.log('Database Admin Check:', admin ? admin.email : 'NOT FOUND');
    expect(admin).toBeDefined();
  });

  it('should login as admin using email', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: 'admin@gmail.com',
      password: 'admin123',
      platform: 'web',
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('user');
    expect(response.body).toHaveProperty('token');
    expect(response.body.user.role).toBe('admin');
  });

  it('should login as santri using name', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: 'Santri Satu',
      password: 'santri123',
      platform: 'web',
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('user');
    expect(response.body).toHaveProperty('token');
    expect(response.body.user.role).toBe('santri');
  });

  it('should return 404 for non-existent user', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: 'nonexistent@gmail.com',
      password: 'wrongpassword',
      platform: 'web',
    });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Invalid credentials');
  });

  it('should return 401 for wrong password', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: 'admin@gmail.com',
      password: 'wrongpassword',
      platform: 'web',
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Invalid credentials');
  });

  it('should return 400 for invalid payload', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: 'admin@gmail.com',
      // missing password
      platform: 'web',
    });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message');
  });
});
