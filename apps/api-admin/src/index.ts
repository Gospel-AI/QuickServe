import 'dotenv/config';
import { createServer } from 'http';
import app from './app.js';
import { prisma } from './config/database.js';
import { env } from './config/env.js';

const server = createServer(app);

async function main() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');

    server.listen(env.PORT, () => {
      console.log(`🔐 Admin API running on port ${env.PORT}`);
      console.log(`📚 Environment: ${env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  server.close(() => {
    console.log('👋 Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 SIGTERM received, shutting down...');
  await prisma.$disconnect();
  server.close(() => {
    process.exit(0);
  });
});

main();
