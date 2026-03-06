import type { ApolloContext } from '../types/context.js';

export const gpsResolvers = {
  Query: {
    async gpsReadings(
      _: any,
      args: {
        filter?: {
          stationId?: string;
          minMagnitude?: number;
          maxMagnitude?: number;
          startTime?: Date;
          endTime?: Date;
        };
        pagination?: { skip?: number; take?: number };
      },
      context: ApolloContext,
    ) {
      const where: any = {};

      if (args.filter?.stationId) where.stationId = args.filter.stationId;
      if (args.filter?.minMagnitude || args.filter?.maxMagnitude) {
        where.magnitude = {};
        if (args.filter.minMagnitude) where.magnitude.gte = args.filter.minMagnitude;
        if (args.filter.maxMagnitude) where.magnitude.lte = args.filter.maxMagnitude;
      }
      if (args.filter?.startTime || args.filter?.endTime) {
        where.timestamp = {};
        if (args.filter.startTime) where.timestamp.gte = args.filter.startTime;
        if (args.filter.endTime) where.timestamp.lte = args.filter.endTime;
      }

      const [data, totalCount] = await Promise.all([
        context.prisma.gPSReading.findMany({
          where,
          include: { station: true },
          orderBy: { timestamp: 'desc' },
          take: args.pagination?.take || 50,
          skip: args.pagination?.skip || 0,
        }),
        context.prisma.gPSReading.count({ where }),
      ]);

      return data;
    },

    async gpsStations(
      _: any,
      args: { isActive?: boolean; pagination?: { skip?: number; take?: number } },
      context: ApolloContext,
    ) {
      return context.prisma.gPSStation.findMany({
        where: args.isActive !== undefined ? { isActive: args.isActive } : {},
        take: args.pagination?.take || 100,
        skip: args.pagination?.skip || 0,
        orderBy: { stationId: 'asc' },
      });
    },

    async gpsStation(_: any, args: { stationId: string }, context: ApolloContext) {
      return context.prisma.gPSStation.findUnique({
        where: { stationId: args.stationId },
      });
    },

    async gpsReading(_: any, args: { id: string }, context: ApolloContext) {
      return context.prisma.gPSReading.findUnique({
        where: { id: args.id },
        include: { station: true },
      });
    },
  },

  Subscription: {
    newGPSReading: {
      subscribe: async function* () {
        // Placeholder for real-time GPS reading subscription
        // In production, this would connect to a pub/sub system
        yield { newGPSReading: {} };
      },
    },
  },
};
