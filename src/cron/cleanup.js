import cron from "node-cron";
import dayjs from "dayjs";
import { prisma } from "../db/index.js";
import { logger } from "../config/logger.js";

async function cleanup() {
  logger.info("Running cleanup job...");
  const now = dayjs();

  try {
    const deleted = await prisma.example.deleteMany({
      where: { expiresAt: { lt: now.toDate() } },
    });
    logger.info(`Deleted ${deleted.count} expired records`);
  } catch (err) {
    logger.error("Cleanup failed:", err);
  }
}

// Run immediately on startup
cleanup();

// Schedule every midnight
cron.schedule("0 0 * * *", cleanup);
