import { prisma } from '../utils/prisma';
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { generateWebToken, generateMobileToken } from '../utils/jwt';
import { loginSchema } from '../validation/authValidation';
import { Platform } from '@prisma/client';

export const login = async (req: Request, res: Response) => {
  try {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const { email: identifier, password, platform } = validation.data;

    const isEmail = identifier.includes('@');

    const user = await prisma.user.findFirst({
      where: isEmail 
        ? { email: identifier } 
        : { santri: { nama: identifier } },
      include: { santri: true }
    });

    if (!user) {
      return res.status(404).json({ message: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    let roleId: number | null = null;

    if (user.role === "santri") {
      roleId = user.santri?.id ?? null;
    } else if (user.role === "ustadz") {
      const ustadz = await prisma.ustadz.findUnique({ where: { userId: user.id } });
      roleId = ustadz?.id ?? null;
    } else if (user.role === "ortu") {
      const ortu = await prisma.orangTua.findUnique({ where: { userId: user.id } });
      roleId = ortu?.id ?? null;
    }

    const payloadWeb = {
      id: user.id,
      role: user.role,
      roleId,
      email: user.email,
      isMobile: false,
    };

    const payloadMobile = {
      id: user.id,
      role: user.role,
      roleId,
      email: user.email,
      isMobile: true,
    };

    const token = platform === 'web' ? generateWebToken(payloadWeb) : generateMobileToken(payloadMobile);

    if (platform === 'mobile') {
      await prisma.tokenStore.create({
        data: {
          userId: user.id,
          token,
          platform: Platform.mobile,
        },
      });
    }

    return res.status(200).json({
      message: 'Login success',
      status: 200,
      token,
      user: {
        id: user.id,
        roleId,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      return res.status(500).json({ message: 'Internal server error', status: 500 });
    } else {
      return res.status(500).json({ message: 'Internal server error', status: 500 });
    }
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const deleted = await prisma.tokenStore.deleteMany({ where: { userId } });
    if (deleted.count === 0) {
      return res.status(404).json({ message: 'Token not found', status: 404 });
    }
    return res.status(200).json({ message: 'Logout success', status: 200 });
  } catch (err: unknown) {
    if (err instanceof Error) {
      return res.status(500).json({ message: 'Internal server error', status: 500 });
    } else {
      return res.status(500).json({ message: 'Internal server error', status: 500 });
    }
  }
};
