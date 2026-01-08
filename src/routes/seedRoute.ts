import { Router } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../utils/prisma';
import { Role } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();
const seedRouter = Router();

const emailAdmin = process.env.EMAIL_ADMIN;
const passwordAdmin = process.env.PASSWORD_ADMIN;

seedRouter.post('/seed-admin', async (req, res) => {
  const existingAdmin = await prisma.user.findFirst({ where: { role: Role.admin } });
  if (existingAdmin) return res.status(400).json({ message: 'Admin already exists', status: 400 });

  const hashed = await bcrypt.hash(passwordAdmin as string, 10);

  const admin = await prisma.user.create({
    data: {
      email: emailAdmin as string,
      password: hashed,
      role: Role.admin,
    },
  });

  return res.status(201).json({ message: 'Admin created', status: 201, data: admin });
});

export default seedRouter;
