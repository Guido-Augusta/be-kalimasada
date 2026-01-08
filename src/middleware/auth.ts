import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { Role } from '@prisma/client';
import { prisma } from '../utils/prisma';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    roleId: number;
    role: Role;
  };
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const platform = req.headers["x-platform"];

  if (!platform || (platform !== 'web' && platform !== 'mobile')) {
    return res.status(400).json({ message: 'Invalid or missing x-platform header', status: 400 });
  }

  if (!authHeader) return res.status(401).json({ message: 'Token missing', status: 401 });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyToken(token);

    if (platform === 'web' && decoded.isMobile) {
      return res.status(403).json({ message: 'Mobile token cannot be used on web', status: 403 });
    }

    if (platform === 'mobile') {
      const tokenInDb = await prisma.tokenStore.findUnique({ where: { token } });

      if (!tokenInDb) {
        return res.status(401).json({ message: 'Token not found or revoked for mobile', status: 401 });
      }

      if (tokenInDb.platform !== 'mobile') {
        return res.status(403).json({ message: `Token only valid for ${tokenInDb.platform}`, status: 403 });
      }
    }

    req.user = decoded as { id: number; role: Role, roleId: number };
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Token invalid', status: 403 });
  }
};

export const isAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== Role.admin) {
    return res.status(403).json({ message: 'Admin only', status: 403 });
  }
  next();
};

// ustadz
export const isUstadzOrAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  const user = req.user;

  if (!user) return res.status(401).json({ message: "Unauthorized", status: 401 });

  if (user.role === Role.admin) return next();

  if (user.role === Role.ustadz) {
    const paramId = req.params.id ? Number(req.params.id) : null;

    if (!paramId) {
      return next();
    }

    if (req.originalUrl.includes("/hafalan") && paramId) {
      return next()
    }

    if (req.originalUrl.includes("/surat-selesai")) {
      // Akses ustadz ke santri
      return checkUstadzAccessToSantri(user.id, paramId, res, next);
    } else {
      // Akses ustadz ke profilnya sendiri
      return checkUstadzAccess(user.id, paramId, res, next);
    }
  }

  return res.status(403).json({ message: "Forbidden", status: 403 });
};

const checkUstadzAccess = async (
  userId: number,
  ustadzId: number,
  res: Response,
  next: NextFunction
) => {
  const ustadz = await prisma.ustadz.findUnique({ where: { id: ustadzId } });
  if (!ustadz || ustadz.userId !== userId) {
    return res.status(403).json({ message: "Tidak punya akses ke data ini", status: 403 });
  }
  next();
};

const checkUstadzAccessToSantri = async (
  userId: number,
  santriId: number,
  res: Response,
  next: NextFunction
) => {
  const ustadz = await prisma.ustadz.findUnique({ where: { userId } });
  if (!ustadz) return res.status(403).json({ message: "Akun ustadz tidak ditemukan", status: 403 });

  const santri = await prisma.santri.findUnique({ where: { id: santriId } });
  if (!santri) return res.status(404).json({ message: "Santri tidak ditemukan", status: 404 });

  next();
};

// ortu
export const isOrtuOrAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  const user = req.user;
  const paramId = Number(req.params.id);

  if (!user) return res.status(401).json({ message: "Unauthorized" });

  if (user.role === Role.admin) return next();

  if (user.role === Role.ortu) {
    return checkOrtuAccess(user.id, paramId, res, next);
  }

  return res.status(403).json({ message: "Forbidden", status: 403 });
};

const checkOrtuAccess = async (
  userId: number,
  ortuId: number,
  res: Response,
  next: NextFunction
) => {
  const ortu = await prisma.orangTua.findUnique({ where: { id: ortuId } });
  if (!ortu || ortu.userId !== userId) {
    return res.status(403).json({ message: "Tidak punya akses ke data ini", status: 403 });
  }
  next();
};
  
// santri
export const isSantriOrAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  const user = req.user;
  const paramId = Number(req.params.id);

  if (!user) return res.status(401).json({ message: "Unauthorized", status: 401 });

  if (user.role === Role.admin) return next();

  if (user.role === Role.santri) {
    return checkSantriAccess(user.id, paramId, res, next);
  }

  return res.status(403).json({ message: "Forbidden", status: 403 });
};

const checkSantriAccess = async (
  userId: number,
  santriId: number,
  res: Response,
  next: NextFunction
) => {
  const santri = await prisma.santri.findUnique({ where: { id: santriId } });
  if (!santri || santri.userId !== userId) {
    return res.status(403).json({ message: "Tidak punya akses ke data ini", status: 403 });
  }
  next();
};

// isAdminUstadSantri
export const isAdminUstadSantri = (req: AuthRequest, res: Response, next: NextFunction) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({ message: "Unauthorized", status: 401 });
  }

  if (user.role === Role.admin || user.role === Role.ustadz || user.role === Role.santri) {
    return next();
  }

  return res.status(403).json({ message: "Forbidden", status: 403 });
};