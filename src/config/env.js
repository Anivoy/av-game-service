import { config } from 'dotenv';
config();

const serverConfig = Object.freeze({
  PORT: parseInt(process.env.PORT || '7300'),
  MODE: process.env.NODE_ENV || 'production',
});

const serviceConfig = Object.freeze({
  SCENE_SERVICE_URL: process.env.SCENE_SERVICE_URL,
});

const redisConfig = Object.freeze({
  REDIS_HOST: process.env.REDIS_HOST,
  REDIS_PORT: process.env.REDIS_PORT,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  REDIS_DB: process.env.REDIS_DB,
});

export { serverConfig, serviceConfig, redisConfig };
