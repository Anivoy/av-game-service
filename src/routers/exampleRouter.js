import express from "express";
import { exampleController } from "../controllers/exampleController.js";

const router = express.Router();

router.post("/test", exampleController);

export default router;
