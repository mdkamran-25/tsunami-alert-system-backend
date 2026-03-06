import cron from 'node-cron';
import type { ScheduledTask } from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { fetchMultipleRegions } from '../lib/earthEngine.js';
import { childLogger } from '../utils/logger.js';

const logger = childLogger('satellite-fetcher');
const prisma = new PrismaClient();

const TSUNAMI_REGIONS = [
  {
    name: 'Pacific Northwest (Cascadia)',
    bounds: [
      [-130, 44],
      [-120, 50],
    ],
  },
  {
    name: 'Alaska Aleutian',
    bounds: [
      [-165, 50],
      [-140, 65],
    ],
  },
  {
    name: 'Indo-Pacific Ring',
    bounds: [
      [90, -10],
      [150, 20],
    ],
  },
  {
    name: 'Japan Trench',
    bounds: [
      [130, 30],
      [145, 45],
    ],
  },
  {
    name: 'Peru-Chile Trench',
    bounds: [
      [-77, -45],
      [-70, -5],
    ],
  },
];

export function startSatelliteDataFetcher() {
  // Run every 2 hours: 0 */2 * * *
  // For testing every 5 minutes: */5 * * * *
  const job = cron.schedule('0 */2 * * *', async () => {
    try {
      logger.info('📡 [CRON] Starting satellite data fetch from Earth Engine...');

      const data = await fetchMultipleRegions(TSUNAMI_REGIONS);

      if (data.length === 0) {
        logger.warn('[CRON] No satellite data fetched');
        return;
      }

      // Save to database
      let savedCount = 0;
      for (const item of data) {
        try {
          await prisma.satelliteData.create({
            data: {
              imageUrl: item.imageUrl,
              region: item.region,
              regionBounds: JSON.stringify([-130, 44, -120, 50]),
              regionCenter: JSON.stringify([-125, 47]),
              anomalyScore: item.anomalyScore,
              anomalyDetected: item.anomalyScore > 0.5,
              timestamp: item.timestamp,
              metadata: {
                source: 'Google Earth Engine',
                satellite: 'Sentinel-1',
                ...item.metadata,
              },
              processingInfo: {
                algorithm: 'Change Detection Analysis',
                threshold: 0.5,
                comparisonPeriod: '11 months',
              },
            },
          });
          savedCount++;
        } catch (dbError) {
          logger.error(`Error saving ${item.region} to database:`, dbError);
        }
      }

      logger.info(`✅ [CRON] Saved ${savedCount}/${data.length} satellite images to database`);
    } catch (error) {
      logger.error('❌ [CRON] Error in satellite data fetcher:', error);
    }
  });

  logger.info('📅 Satellite data fetcher job scheduled (every 2 hours)');
  return job;
}

export function stopSatelliteDataFetcher(job: ScheduledTask) {
  job.stop();
  logger.info('⏹️ Satellite data fetcher job stopped');
}
