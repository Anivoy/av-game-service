import winston from "winston";

export const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: false }),
    winston.format.printf(({ level, message, timestamp, ...meta }) => {
      const metaString =
        Object.keys(meta).length > 0 ? `\n${JSON.stringify(meta, null, 2)}` : '';
      return `${timestamp} [${level.toUpperCase()}]: ${message}${metaString}`;
    })
  ),
  transports: [new winston.transports.Console()],
});

export const stream = {
  write: (message) => logger.info(message.trim()),
};
