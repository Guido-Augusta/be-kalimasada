import { Request, Response } from "express";
import { ChartRange, getChartData } from "../services/chartService";
import { prisma } from "../utils/prisma";

export async function getChartHafalanController(req: Request, res: Response) {
  try {
    const { range = "1w", santriId } = req.query;

    if (!santriId) {
      return res.status(400).json({ message: "santriId is required", status: 400 });
    }

    const santri = await prisma.santri.findUnique({ where: { id: parseInt(santriId as string, 10) } });
    if (!santri) {
      return res.status(404).json({ message: "Santri not found", status: 404 });
    }

    const data = await getChartData(
      parseInt(santriId as string, 10),
      range as ChartRange
    );

    return res.json({ 
      message: "Chart data", 
      status: 200, 
      santri: {
        nama: santri.nama, 
        tahapHafalan: santri.tahapHafalan, 
        totalPoin: santri.totalPoin
      }, 
      data 
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return res.status(500).json({ message: "Server error", status: 500 });
    } else {
      return res.status(500).json({ message: "Server error", status: 500 });
    }
  }
}