import { config } from "dotenv";
config();

const serverConfig = Object.freeze({
  PORT: parseInt(process.env.PORT || "5087"),
  MODE: process.env.NODE_ENV || "production",
  DATABASE_URL: process.env.DATABASE_URL
});

const rateLimitConfig = Object.freeze({
  GLOBAL_LIMIT_WINDOW: parseInt(process.env.GLOBAL_LIMIT_WINDOW || `${15 * 60 * 1000}`), // 15 minutes
  GLOBAL_LIMIT_MAX: parseInt(process.env.GLOBAL_LIMIT_MAX || "100")
})
export {
  serverConfig,
  rateLimitConfig
}