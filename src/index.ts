import express from 'express';
import { createServer } from 'http';
import prisma from './lib/prisma.js';
import { createApolloServer, setupExpressApp } from './config/apollo.js';
import { childLogger } from './utils/logger.js';
import {
  startSatelliteDataFetcher,
  stopSatelliteDataFetcher,
} from './jobs/satelliteDataFetcher.js';
import { startGPSIngestion } from './services/gpsDataIngestion.js';
import { startAlertEngine } from './services/alertEngine.js';
import { initializeEmailService } from './services/notificationService.js';
import type { ScheduledTask } from 'node-cron';

const log = childLogger('server');

const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';

let satelliteJob: ScheduledTask | null = null;
let gpsInterval: NodeJS.Timeout | null = null;
let alertInterval: NodeJS.Timeout | null = null;

async function bootstrap() {
  try {
    // Initialize database
    log.info('Initializing database connection...');
    await prisma.$connect();
    log.info('✅ Database connected');

    // Create Express app
    const app = express();
    const httpServer = createServer(app);

    // Create Apollo Server
    log.info('Creating Apollo Server...');
    const server = await createApolloServer(httpServer);
    log.info('✅ Apollo Server created');

    // Setup Express middleware
    setupExpressApp(app, server as any);
    log.info('✅ Express middleware configured');

    // 🚀 START REAL-TIME SERVICES
    log.info('🚀 Starting real-time services...');

    // Initialize email notification service
    const emailReady = initializeEmailService();
    if (emailReady) {
      log.info('✅ Email notification service initialized');
    } else {
      log.warn('⚠️ Email notification service failed to initialize - alerts will not be emailed');
    }

    // Start GPS data ingestion (every 5 minutes)
    gpsInterval = startGPSIngestion(5 * 60 * 1000);

    // Start alert engine (every 2 minutes)
    alertInterval = startAlertEngine({
      gpsMagnitudeThreshold: 100,
      satelliteAnomalyThreshold: 0.7,
      minConfidence: 85,
      checkIntervalMs: 2 * 60 * 1000,
    });

    // Start satellite data fetcher job
    satelliteJob = startSatelliteDataFetcher();

    // Start server
    await new Promise<void>((resolve) => {
      httpServer.listen(PORT, () => {
        log.info('');
        log.info('╔════════════════════════════════════════╗');
        log.info('║  🌊 TSUNAMI ALERT SYSTEM READY 🌊  ║');
        log.info('╚════════════════════════════════════════╝');
        log.info('');
        log.info(`✅ Server running at http://localhost:${PORT}`);
        log.info(`✅ GraphQL endpoint: http://localhost:${PORT}/graphql`);
        log.info(`✅ Real-time services enabled`);
        log.info(`✅ Environment: ${NODE_ENV}`);
        log.info('');
        log.info('📊 Active Services:');
        log.info('   ✓ GPS Data Ingestion (every 5 min)');
        log.info('   ✓ Alert Engine (every 2 min)');
        log.info('   ✓ Satellite Data Fetcher');
        log.info('   ✓ Email Notifications (Node Mailer)');
        log.info('   ✓ WebSocket Subscriptions');
        log.info('');
        resolve();
      });
    });
  } catch (error) {
    log.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  log.info('SIGINT received, shutting down gracefully...');

  if (gpsInterval) clearInterval(gpsInterval);
  if (alertInterval) clearInterval(alertInterval);
  if (satelliteJob) {
    stopSatelliteDataFetcher(satelliteJob);
  }

  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  log.info('SIGTERM received, shutting down gracefully...');

  if (gpsInterval) clearInterval(gpsInterval);
  if (alertInterval) clearInterval(alertInterval);
  if (satelliteJob) {
    stopSatelliteDataFetcher(satelliteJob);
  }

  await prisma.$disconnect();
  process.exit(0);
});

bootstrap().catch((error) => {
  log.error(error, 'Bootstrap failed');
  process.exit(1);
});
