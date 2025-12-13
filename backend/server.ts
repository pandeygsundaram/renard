import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import prisma from './config/database';
import qdrantClient from './config/qdrant';
import { initializeCollections } from './services/vectorService';
import { initializeScheduler } from './services/scheduler';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await prisma.$connect();
    console.log('Database connected successfully');

    try {
      await qdrantClient.getCollections();
      console.log('Qdrant connected successfully');

      // Initialize Qdrant collections
      await initializeCollections();
    } catch (error) {
      console.warn('Qdrant connection warning:', error);
    }

    // Initialize scheduled jobs
    initializeScheduler();

    app.listen(PORT, () => {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🚀 DevTrack AI Server is running on port ${PORT}`);
      console.log(`${'='.repeat(60)}\n`);

      console.log(`Health check: http://localhost:${PORT}/api/health\n`);

      console.log(`Auth endpoints:`);
      console.log(`  POST http://localhost:${PORT}/api/auth/register`);
      console.log(`  POST http://localhost:${PORT}/api/auth/login`);
      console.log(`  GET  http://localhost:${PORT}/api/auth/profile\n`);

      console.log(`Message Ingestion (buffered):`);
      console.log(`  POST http://localhost:${PORT}/api/messages`);
      console.log(`  POST http://localhost:${PORT}/api/messages/batch`);
      console.log(`  GET  http://localhost:${PORT}/api/messages/stats\n`);

      console.log(`Activity endpoints (immediate processing):`);
      console.log(`  POST http://localhost:${PORT}/api/activities`);
      console.log(`  GET  http://localhost:${PORT}/api/activities`);
      console.log(`  GET  http://localhost:${PORT}/api/activities/search?query=<query>`);
      console.log(`  GET  http://localhost:${PORT}/api/activities/:id\n`);

      console.log(`Processing endpoints:`);
      console.log(`  GET  http://localhost:${PORT}/api/processing/queue`);
      console.log(`  POST http://localhost:${PORT}/api/processing/trigger (admin only)\n`);

      console.log(`${'='.repeat(60)}\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
