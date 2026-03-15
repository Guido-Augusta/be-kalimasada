import { Request, Response } from 'express';
import * as ortuService from "../services/ortuService";
import { RegisterOrtuSchema, UpdateOrtuSchema } from "../validation/ortuValidation";
import { AuthRequest } from "../middleware/auth";
import fs from "fs";
import { prisma } from "../utils/prisma";
import path from "path";
import { sendAccountEmail, sendUpdateEmail } from '../utils/sendAccountEmail';
import { getBaseUrl } from '../utils/url';

const url = getBaseUrl();

export const create = async (req: Request, res: Response) => {
  try {
    const filePath = req.file ? `${url}/public/ortu/${req.file.filename}` : "https://res.cloudinary.com/dqrppoiza/image/upload/v1754292060/placeholder_profile_ff5xwy.jpg";

    const validation = RegisterOrtuSchema.safeParse({
      ...req.body,
      fotoProfil: req.file,
    });

    if (!validation.success) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        message: "Validation failed",
        status: 400,
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const plainPassword = req.body.password;

    const result = await ortuService.registerOrangTua({ ...req.body, fotoProfil: filePath });

    if (req.body.email && req.body.password) {
      await sendAccountEmail({
        to: req.body.email,
        name: req.body.nama,
        email: req.body.email,
        password: plainPassword,
        role: "Orang Tua",
      });
    }

    return res.status(201).json({ message: 'Orang Tua created', status: 201, data: result });
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
    let tipe = typeof req.query.tipe === "string" ? req.query.tipe : undefined;

    if (tipe && tipe === "ayah") {
      tipe = "Ayah";
    } else if (tipe && tipe === "ibu") {
      tipe = "Ibu";
    } else if (tipe && tipe === "wali") {
      tipe = "Wali";
    }

    if (role === "admin") {
      const result = await ortuService.getOrangTuaForAdmin({ search, page, limit, tipe });

      return res.status(200).json({ message: "Orang Tua for admin", status: 200, ...result });
    }

    return res.status(403).json({ message: "Akses ditolak", status: 403 });
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message === "Orang Tua not found") {
        return res.status(403).json({ message: "Akses ditolak: Anda bukan admin", status: 403 });
      }
    }
    return res.status(500).json({ message: "Internal server error", status: 500 });
  }
};

export const getOne = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const data = await ortuService.getOrangTuaById(id);
    if (!data) {
      return res.status(404).json({ message: 'Orang Tua not found', status: 404 });
    }
    return res.status(200).json({ message: 'Orang Tua found', status: 200, data });
  } catch (err: unknown) {
    if (err instanceof Error) {
      return res.status(500).json({ message: 'Internal server error', status: 500 });
    }
    return res.status(500).json({ message: 'Internal server error', status: 500 });
  }
};

export const getByName = async (req: Request, res: Response) => {
  try {
    const nama = req.params.nama;
    const data = await ortuService.getOrangTuaByName(nama as string);
    if (!data || data.length === 0) {
      return res.status(404).json({ message: 'Orang Tua not found', status: 404 });
    }
    return res.status(200).json({ message: 'Orang Tua found', status: 200, data });
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
    const ortuLama = await prisma.orangTua.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!ortuLama) {
      return res.status(404).json({ message: "Orang Tua not found", status: 404 });
    }

    const validation = UpdateOrtuSchema.safeParse({
      ...req.body,
      fotoProfil: req.file,
    });

    if (!validation.success) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        message: "Validation failed",
        status: 400,
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const oldEmail = ortuLama.user?.email as string;
    const newEmail = validation.data.email as string;
    const passwordChanged = !!validation.data.password;
    const newPassword = validation.data.password || null;

    if (req.file && ortuLama.fotoProfil && ortuLama.fotoProfil.includes("/public/ortu")) {
      const relativePath = ortuLama.fotoProfil.replace(/^.*\/public\//, "public/");
      const oldPath = path.join(__dirname, '../../', relativePath);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    const filePath = req.file
      ? `${url}/public/ortu/${req.file.filename}`
      : ortuLama.fotoProfil;

    const data = {
      ...validation.data,
      fotoProfil: filePath,
    };

    if (req.user?.role !== "admin") {
      delete data.tipe;
      delete data.email;
      delete data.password;
    }

    const result = await ortuService.updateOrangTuaAndUser(id, data);

    // Check if email or password was updated by an admin
    if (req.user?.role === "admin") {
      const emailUpdated = oldEmail && newEmail && oldEmail !== newEmail;

      if (emailUpdated || passwordChanged) {
        if (emailUpdated) {
          await sendUpdateEmail({
            to: oldEmail,
            name: ortuLama.nama,
            oldEmail,
            newEmail,
            role: "Orang Tua",
            passwordChanged,
            newPassword
          });
        }

        if (emailUpdated || passwordChanged) {
          await sendUpdateEmail({
            to: newEmail || oldEmail,
            name: ortuLama.nama,
            oldEmail,
            newEmail,
            role: "Orang Tua",
            passwordChanged,
            newPassword
          });
        }
      }
    }

    return res.status(200).json({ message: "Orang Tua updated", status: 200, data: result });
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message.includes('Orang Tua not found')) {
        return res.status(404).json({ message: 'Orang Tua not found', status: 404 });
      }
      if (err.message.includes('Email already exists')) {
        return res.status(400).json({ message: 'Email already exists', status: 400 });
      }
    }
    return res.status(500).json({ message: 'Internal server error', status: 500 });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const result = await ortuService.deleteOrangTua(id);
    return res.status(200).json({ message: 'Orang Tua deleted', status: 200, data: result });
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message.includes('Orang Tua not found')) {
        return res.status(404).json({ message: 'Orang Tua not found', status: 404 });
      }
    }
    return res.status(500).json({ message: 'Internal server error', status: 500 });
  }
};
