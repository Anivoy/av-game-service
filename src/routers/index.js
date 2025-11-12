import express from "express";
import serverUtilityRoutes from "./serverUtility.js";
import exampleRouter from "./exampleRouter.js";
import { exampleMiddleware } from "../middleware/exampleMiddleware.js";

const router = express.Router();

router.use("/utility", serverUtilityRoutes);
router.use("/example", exampleMiddleware, exampleRouter)

export default router;
