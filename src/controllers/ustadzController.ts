import { Request, Response } from 'express';
import * as ustadzService from '../services/ustadzService';
import { RegisterUstadzSchema, UpdateUstadzSchema } from '../validation/ustadzValidation';
import { AuthRequest } from '../middleware/auth';
import fs from "fs";
import { prisma } from "../utils/prisma";
import path from "path";
import { sendAccountEmail, sendUpdateEmail } from '../utils/sendAccountEmail';
import { JenisKelamin, TahapHafalan } from "@prisma/client";

const url = process.env.NODE_ENV === "production" ? process.env.PROD_URL : process.env.DEV_URL;

export type UpdateUstadzPayload = {
  email?: string;
  password?: string;
  nama?: string;
  nomorHp?: string;
  alamat?: string;
  jenisKelamin?: JenisKelamin;
  waliKelasTahap?: TahapHafalan | null;
  fotoProfil?: string | null;
}

export const create = async (req: Request, res: Response) => {
  try {
    const filePath = req.file ? `${url}/public/ustadz/${req.file.filename}` : "https://res.cloudinary.com/dqrppoiza/image/upload/v1754292060/placeholder_profile_ff5xwy.jpg";

    if (req.body.waliKelasTahap === "") {
      req.body.waliKelasTahap = null;
    }

    const validation = RegisterUstadzSchema.safeParse({
      ...req.body,
      fotoProfil: req.file,
    });

    if (!validation.success) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        message: "Validation failed",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const plainPassword = validation.data.password;

    const result = await ustadzService.registerUstadz({ ...validation.data, fotoProfil: filePath });

    await sendAccountEmail({
      to: validation.data.email,
      name: validation.data.nama,
      email: validation.data.email,
      password: plainPassword,
      role: "Ustadz",
    });

    return res.status(201).json({ message: 'Ustadz created', status: 201, data: result });
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message.includes('Email already exists')) {
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ message: 'Email already exists', status: 400 });
      }
    }
    return res.status(500).json({ message: 'Internal server error', status: 500 });
  }
};

export const getAll = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized", status: 401 });

    const role = req.user.role;
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 10;

    if (role === "admin") {
      const result = await ustadzService.getUstadzForAdmin({
        waliKelasTahap: req.query.waliKelasTahap as string,
        search,
        page,
        limit,
      });

      return res.status(200).json({ message: "Ustadz for admin", status: 200, ...result });
    }

    return res.status(403).json({ message: "Akses ditolak", status: 403 });
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message === "Ustadz not found") {
        return res.status(403).json({ message: "Akses ditolak: Anda bukan ustadz", status: 403 });
      }
    }
    return res.status(500).json({ message: "Internal server error", status: 500 });
  }
};

export const getOne = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const data = await ustadzService.getUstadzById(id);
    if (!data) {
      return res.status(404).json({ message: 'Ustadz not found', status: 404 });
    }
    return res.status(200).json({ message: 'Ustadz found', status: 200, data });
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message.includes("Ustadz not found")) {
        return res.status(404).json({ message: 'Ustadz not found', status: 404 });
      }
    }
    return res.status(500).json({ message: 'Internal server error', status: 500 });
  }
};

export const getByName = async (req: Request, res: Response) => {
  try {
    const nama = req.params.nama;
    const data = await ustadzService.getUstadzByName(nama as string);
    if (!data || data.length === 0) {
      return res.status(404).json({ message: 'Ustadz not found', status: 404 });
    }
    return res.status(200).json({ message: 'Ustadz found', status: 200, data });
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message.includes("Ustadz not found")) {
        return res.status(404).json({ message: 'Ustadz not found', status: 404 });
      }
    }
    return res.status(500).json({ message: 'Internal server error', status: 500 });
  }
};

export const update = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const ustadzLama = await prisma.ustadz.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!ustadzLama) {
      return res.status(404).json({ message: 'Ustadz not found', status: 404 });
    }

    if (req.body.waliKelasTahap === "") {
      req.body.waliKelasTahap = null;
    }

    const payload: UpdateUstadzPayload = {
      ...req.body,
      fotoProfil: req.file,
    };

    // Allow admin to update email, password, and waliKelasTahap
    if (req.user?.role === "admin") {
      if (req.body.email) payload.email = req.body.email;
      if (req.body.password) payload.password = req.body.password;
    }

    const validation = await UpdateUstadzSchema.safeParseAsync(payload);

    if (!validation.success) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        message: 'Validation failed',
        status: 400,
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const oldEmail = ustadzLama.user?.email as string;
    const newEmail = validation.data.email as string;
    const passwordChanged = !!validation.data.password;
    const newPassword = validation.data.password || null;

    // Remove fields that non-admins cannot change
    if (req.user?.role !== "admin") {
      delete validation.data.email;
      delete validation.data.password;
      delete validation.data.waliKelasTahap;
    }

    if (req.file && ustadzLama.fotoProfil && ustadzLama.fotoProfil.includes("/public/ustadz")) {
      const relativePath = ustadzLama.fotoProfil.replace(/^.*\/public\//, "public/");
      const oldPath = path.join(__dirname, '../../', relativePath);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    const filePath = req.file
      ? `${url}/public/ustadz/${req.file.filename}`
      : ustadzLama.fotoProfil;

    const dataToUpdate = {
      ...validation.data,
      fotoProfil: filePath,
    };

    const result = await ustadzService.updateUstadzProfileAndUser(id, dataToUpdate);

    // Optional: Add logic to send an email notification about the update, similar to ortuControllers.ts
    if (req.user?.role === "admin") {
      const emailUpdated = oldEmail && newEmail && oldEmail !== newEmail;

      if (emailUpdated || passwordChanged) {
        if (emailUpdated) {
          await sendUpdateEmail({
            to: oldEmail,
            name: ustadzLama.nama,
            oldEmail,
            newEmail,
            role: "Ustadz",
            passwordChanged,
            newPassword
          });
        }

        if (emailUpdated || passwordChanged) {
          await sendUpdateEmail({
            to: newEmail || oldEmail,
            name: ustadzLama.nama,
            oldEmail,
            newEmail,
            role: "Ustadz",
            passwordChanged,
            newPassword
          });
        }
      }
    }

    return res.status(200).json({ message: 'Ustadz updated', status: 200, data: result });
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message.includes('not found')) {
        return res.status(404).json({ message: 'Ustadz not found', status: 404 });
      }
      if (err.message.includes('Email already exists')) {
        return res.status(400).json({ message: 'Email already exists', status: 400 });
      }
      return res.status(500).json({ message: 'Internal server error', status: 500 });
    }
    return res.status(500).json({ message: 'Internal server error', status: 500 });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const result = await ustadzService.deleteUstadz(id);
    return res.status(200).json({ message: 'Ustadz deleted', status: 200, data: result });
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message.includes('Ustadz not found')) {
        return res.status(404).json({ message: 'Ustadz not found', status: 404 });
      }
    }
    return res.status(500).json({ message: 'Internal server error', status: 500 });
  }
};
