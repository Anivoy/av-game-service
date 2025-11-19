import express from "express";
import cors from "cors";
import helmet from "helmet";

import { stream } from "./config/logger.js";
import morgan from "morgan";

import routes from "./routers/index.js";

import { errorHandler } from './middleware/error.middleware.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("combined", { stream }));

app.use("/api/v1", routes);

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Game service is up" });
});

app.use(errorHandler)

export default app;
