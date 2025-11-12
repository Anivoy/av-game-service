import app from "./app.js";
import { serverConfig } from "./config/env.js";
import { displayBanner, testDatabaseConnection } from "./utils/serverUtility.js";

const startServer = async () => {
  try {
    displayBanner();

    await testDatabaseConnection();

    const server = app.listen(serverConfig.PORT, () => {
      console.log(`Server running on port ${serverConfig.PORT}\n`);
    });

    process.on('SIGTERM', () => gracefulShutdown(server));
    process.on('SIGINT', () => gracefulShutdown(server));

    process.on('uncaughtException', (error) => {
      console.log('Uncaught Exception:', error);
      gracefulShutdown(server);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.log('Unhandled Rejection:', promise, 'reason:', reason);
      gracefulShutdown(server);
    });
  } catch (error) {
    console.log('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();