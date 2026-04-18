import { Request, Response } from 'express';
import * as santriService from "../services/santriService";
import fs from "fs";
import { RegisterSantriSchema, UpdateSantriSchema } from '../validation/santriValidation';
import { prisma } from "../utils/prisma";
import path from "path";
import { AuthRequest } from '../middleware/auth';
import { sendAccountEmail, sendUpdateEmail } from '../utils/sendAccountEmail';
import { JenisKelamin, TahapHafalan } from '@prisma/client';
import { getBaseUrl } from '../utils/url';

const url = getBaseUrl();

type UpdateSantriPayload = {
  password?: string;
  ortuId?: number[];
  nama?: string;
  tahapHafalan?: TahapHafalan;
}

export const create = async (req: Request, res: Response) => {
  try {
    let ortuIds: number[] = [];
    if (req.body.ortuId) {
      ortuIds = Array.isArray(req.body.ortuId) 
        ? req.body.ortuId.map(Number) 
        : JSON.parse(req.body.ortuId).map(Number);
    }

    const validation = await RegisterSantriSchema.safeParseAsync({
      ...req.body,
      ortuId: ortuIds,
    });

    if (!validation.success) {
      return res.status(400).json({
        message: "Validation failed",
        status: 400,
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const plainPassword = req.body.password;

    const result = await santriService.registerSantri({ ...req.body, ortuId: ortuIds });

    // Find parent email
    const parents = await prisma.orangTua.findMany({
      where: { id: { in: ortuIds } },
      include: { user: true }
    });
    const parentEmail = parents.find(p => p.user?.email)?.user?.email;

    if (parentEmail) {
      await sendAccountEmail({
        to: parentEmail,
        name: req.body.nama,
        email: req.body.nama, // Santri logs in with Name
        password: plainPassword,
        role: "Santri",
      });
    }

    return res.status(201).json({ message: 'Santri created', status: 201, data: result });
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message.includes('already exists')) {
        return res.status(400).json({ message: err.message, status: 400 });
      }
    }
    return res.status(500).json({ message: 'Internal server error', status: 500 });
  }
};

export const getOne = async (req: Request, res: Response) => {
  try {
    const data = await santriService.getSantriById(Number(req.params.id));
    if (!data) {
      return res.status(404).json({ message: 'Santri not found', status: 404 });
    }
    return res.status(200).json({ message: 'Santri found', status: 200, data });
  } catch (err: unknown) {
    if (err instanceof Error) {
      return res.status(500).json({ message: 'Internal server error', status: 500 });
    }
    return res.status(500).json({ message: 'Internal server error', status: 500 });
  }
};

export const getByName = async (req: Request, res: Response) => {
  try {
    const data = await santriService.getSantriByName(req.params.nama as string);
    if (!data || data.length === 0) {
      return res.status(404).json({ message: 'Santri not found', status: 404 });
    }
    return res.status(200).json({ message: 'Santri found', status: 200, data });
  } catch (err: unknown) {
    if (err instanceof Error) {
      return res.status(500).json({ message: 'Internal server error', status: 500 });
    }
    return res.status(500).json({ message: 'Internal server error', status: 500 });
  }
};

export const update = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const santriLama = await prisma.santri.findUnique({
      where: { id },
      include: { user: true, orangTua: { include: { user: true } } }
    });

    if (!santriLama) {
      return res.status(404).json({ message: 'Santri not found', status: 404 });
    }

    const payload: UpdateSantriPayload = {
      ...req.body,
    };

    if (req.user?.role === "admin") {
      const ortuIds = Array.isArray(req.body.ortuId)
        ? req.body.ortuId.map(Number)
        : req.body.ortuId
          ? JSON.parse(req.body.ortuId).map(Number)
          : undefined;
      payload.ortuId = ortuIds;

      if (req.body.password) payload.password = req.body.password;
    }

    if (req.user?.role === "ustadz") {
      const ustadzPayload = {
        tahapHafalan: req.body.tahapHafalan,
      };

      const validation = await UpdateSantriSchema.safeParseAsync(ustadzPayload);

      if (!validation.success) {
        return res.status(400).json({
          message: 'Validation failed',
          status: 400,
          errors: validation.error.flatten().fieldErrors,
        });
      }

      const result = await santriService.updateSantri(id, { tahapHafalan: validation.data.tahapHafalan });
      return res.status(200).json({ message: 'Santri updated by ustadz', status: 200, data: result });
    }

    const validation = await UpdateSantriSchema.safeParseAsync(payload);

    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation failed',
        status: 400,
        errors: validation.error.flatten().fieldErrors,
      });
    }

    if (req.user?.role !== "admin") {
      delete validation.data.ortuId;
      delete validation.data.tahapHafalan;
      delete validation.data.password;
    }

    const result = await santriService.updateSantri(id, validation.data);

    if (req.user?.role === "admin" && validation.data.password) {
      // Find parent email to notify about password change
      const parentEmail = santriLama.orangTua.find(p => p.user?.email)?.user?.email;

      if (parentEmail) {
        await sendUpdateEmail({
          to: parentEmail,
          name: santriLama.nama,
          oldEmail: santriLama.nama,
          newEmail: santriLama.nama,
          role: "Santri",
          passwordChanged: true,
          newPassword: validation.data.password
        });
      }
    }

    return res.status(200).json({ message: 'Santri updated', status: 200, data: result });
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message.includes('not found')) {
        return res.status(404).json({ message: 'Santri not found', status: 404 });
      }
      if (err.message.includes('already exists')) {
        return res.status(400).json({ message: err.message, status: 400 });
      }
    }
    return res.status(500).json({ message: 'Internal server error', status: 500 });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const result = await santriService.deleteSantri(id);
    return res.status(200).json({ message: 'Santri deleted', status: 200, data: result });
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message.includes('Santri not found')) {
        return res.status(404).json({ message: 'Santri not found', status: 404 });
      }
    }
    return res.status(500).json({ message: 'Internal server error', status: 500 });
  }
};

export const getAll = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const ortuId = req.query.ortuId ? Number(req.query.ortuId) : undefined;

    let tahapHafalan: TahapHafalan | undefined;
    if (req.query.tahapHafalan) {
      const tahapQuery = req.query.tahapHafalan as string;
      const tahapNormalized = tahapQuery.toLowerCase();
      const tahapMap: Record<string, TahapHafalan> = {
        level1: TahapHafalan.Level1,
        level2: TahapHafalan.Level2,
        level3: TahapHafalan.Level3,
      };
      tahapHafalan = tahapMap[tahapNormalized];
    }

    if (req.user?.role === "ortu") {
      const result = await santriService.getSantriForOrtu(req.user.roleId, { search, page, limit });
      return res.status(200).json({ message: "Santri for ortu", status: 200, ...result });
    }

    const result = await santriService.getAllSantriWithPagination(page, limit, search, tahapHafalan, ortuId);

    return res.status(200).json({ message: 'Santri found', status: 200, ...result });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return res.status(500).json({ message: 'Internal server error', status: 500 });
    }
    return res.status(500).json({ message: 'Internal Server Error', status: 500 });
  }
};

export const getPeringkatSantri = async (req: Request, res: Response) => {
  try {
    const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 10;
    const search = typeof req.query.search === "string" ? req.query.search : undefined;

    const tahapQuery = (req.query.tahapHafalan as string) || "Level1";
    const tahapNormalized = tahapQuery.toLowerCase();
    const tahapMap: Record<string, TahapHafalan> = {
      level1: TahapHafalan.Level1,
      level2: TahapHafalan.Level2,
      level3: TahapHafalan.Level3,
    };
    const tahapHafalan = tahapMap[tahapNormalized] || TahapHafalan.Level1;

    const result = await santriService.getRankedSantriWithPagination(page, limit, search, tahapHafalan);

    return res.status(200).json({ message: 'Santri found', status: 200, ...result });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return res.status(500).json({ message: 'Internal server error', status: 500 });
    }
    return res.status(500).json({ message: 'Internal Server Error', status: 500 });
  }
};

// reset point all santri and rank
export const resetAllPoints = async (req: Request, res: Response) => {
  try {
    await santriService.resetAllSantriPoints();
    return res.status(200).json({ message: 'All santri points have been reset.', status: 200 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return res.status(500).json({ message: 'Internal server error', status: 500 });
    }
    return res.status(500).json({ message: 'Internal Server Error', status: 500 });
  }
};

// deduct point individual
export const deductPoints = async (req: Request, res: Response) => {
  try {
    const santriId = Number(req.params.id);
    const { poin } = req.body;

    if (!poin || typeof poin !== 'number') {
      return res.status(400).json({ message: 'A valid number of points is required.', status: 400 });
    }

    const updatedSantri = await santriService.deductSantriPoints(santriId, poin);
    return res.status(200).json({ message: 'Points successfully deducted.', status: 200, data: updatedSantri });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes('Santri not found')) {
        return res.status(404).json({ message: 'Santri not found.', status: 404 });
      }
    }
    return res.status(500).json({ message: 'Internal server error', status: 500 });
  }
};
