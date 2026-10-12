import { env } from './config/env';
import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './config/db';
import { logger } from './utils/logger';

async function main() {
  await connectDatabase(env.MONGO_URI);

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`MediConnect backend listening on port ${env.PORT}`);
  });

  async function shutdown(signal: string) {
    logger.info(`Received ${signal}, shutting down gracefully`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error) => {
  logger.error('Failed to start server', { error: error instanceof Error ? error.message : error });
  process.exit(1);
});
