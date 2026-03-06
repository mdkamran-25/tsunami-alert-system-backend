import type { ApolloContext } from '../types/context.js';
import { fetchMultipleRegions } from '../lib/earthEngine.js';
import { childLogger } from '../utils/logger.js';

const logger = childLogger('satellite-resolver');

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

export const satelliteResolvers = {
  Query: {
    async satelliteData(
      _: any,
      args: {
        filter?: {
          region?: string;
          minAnomalyScore?: number;
          maxAnomalyScore?: number;
          startTime?: Date;
          endTime?: Date;
        };
        pagination?: { skip?: number; take?: number };
      },
      context: ApolloContext,
    ) {
      const skip = args.pagination?.skip || 0;
      const take = args.pagination?.take || 10;

      try {
        // Check database for recent data (within 3 hours)
        const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
        let data = await context.prisma.satelliteData.findMany({
          where: {
            timestamp: { gte: threeHoursAgo },
            ...(args.filter?.region && {
              region: { contains: args.filter.region },
            }),
            ...(args.filter?.minAnomalyScore && {
              anomalyScore: { gte: args.filter.minAnomalyScore },
            }),
            ...(args.filter?.maxAnomalyScore && {
              anomalyScore: { lte: args.filter.maxAnomalyScore },
            }),
          },
          orderBy: { timestamp: 'desc' },
          take,
          skip,
        });

        // If no recent data, fetch fresh from Earth Engine
        if (data.length === 0) {
          logger.info('📡 No recent data in database, fetching from Earth Engine...');

          try {
            const freshData = await fetchMultipleRegions(TSUNAMI_REGIONS);

            // Save to database
            for (const item of freshData) {
              await context.prisma.satelliteData.create({
                data: {
                  imageUrl: item.imageUrl,
                  region: item.region,
                  regionBounds: JSON.stringify([-130, 44, -120, 50]),
                  regionCenter: JSON.stringify([-125, 47]),
                  anomalyScore: item.anomalyScore,
                  anomalyDetected: item.anomalyScore > 0.5,
                  timestamp: item.timestamp,
                  metadata: {
                    source: 'Google Earth Engine - Sentinel-1 SAR',
                    ...item.metadata,
                  },
                  processingInfo: {
                    algorithm: 'Change Detection Analysis',
                    threshold: 0.5,
                    comparisonPeriod: '11 months',
                  },
                },
              });
            }

            logger.info(`✅ Saved ${freshData.length} satellite images to database`);

            // Fetch again from DB to apply pagination
            data = await context.prisma.satelliteData.findMany({
              orderBy: { timestamp: 'desc' },
              take,
              skip,
            });
          } catch (eeError) {
            logger.error('Error fetching from Earth Engine:', eeError);
            // Fall back to cached data
            data = await context.prisma.satelliteData.findMany({
              orderBy: { timestamp: 'desc' },
              take,
              skip,
            });
          }
        }

        return data;
      } catch (error) {
        logger.error('Error in satelliteData query:', error);
        // Return cached data as fallback
        return context.prisma.satelliteData.findMany({
          orderBy: { timestamp: 'desc' },
          take,
          skip,
        });
      }
    },

    async latestSatelliteData(_: any, args: { region?: string }, context: ApolloContext) {
      return context.prisma.satelliteData.findFirst({
        where: args.region ? { region: args.region } : {},
        orderBy: { timestamp: 'desc' },
      });
    },

    async satelliteImage(_: any, args: { id: string }, context: ApolloContext) {
      return context.prisma.satelliteData.findUnique({
        where: { id: args.id },
      });
    },
  },

  Subscription: {
    newSatelliteData: {
      subscribe: async function* () {
        // Placeholder for real-time satellite data subscription
        // In production, this would connect to a pub/sub system
        yield { newSatelliteData: {} };
      },
    },
  },
};
