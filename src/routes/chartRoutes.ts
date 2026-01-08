import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import * as chartController from "../controllers/chartController";

const chartRoutes = Router();

chartRoutes.get("/", authMiddleware, chartController.getChartHafalanController);

export default chartRoutes;