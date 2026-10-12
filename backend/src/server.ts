import 'dotenv/config';
import { createApp } from './app';

const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;

const app = createApp();

const server = app.listen(PORT, () => {
  console.log(`MediConnect backend listening on port ${PORT}`);
});

function shutdown(signal: string) {
  console.log(`Received ${signal}, shutting down gracefully`);
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
