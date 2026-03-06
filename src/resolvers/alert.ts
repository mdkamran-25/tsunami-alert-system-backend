import type { ApolloContext } from '../types/context.js';

export const alertResolvers = {
  Query: {
    async currentAlert(_: any, __: any, context: ApolloContext) {
      const alert = await context.prisma.alertStatusRecord.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });

      if (!alert) {
        return {
          id: 'default',
          status: 'SAFE',
          level: 'NONE',
          message: 'System operating normally',
          region: 'All Regions',
          gpsTriggered: false,
          satelliteTriggered: false,
          isActive: true,
          createdAt: new Date(),
        };
      }

      return alert;
    },

    async alertHistory(
      _: any,
      args: {
        filter?: { status?: string; region?: string; startTime?: Date; endTime?: Date };
        pagination?: { skip?: number; take?: number };
      },
      context: ApolloContext,
    ) {
      const where: any = {};

      if (args.filter?.status) where.status = args.filter.status;
      if (args.filter?.region) where.region = args.filter.region;
      if (args.filter?.startTime || args.filter?.endTime) {
        where.createdAt = {};
        if (args.filter.startTime) where.createdAt.gte = args.filter.startTime;
        if (args.filter.endTime) where.createdAt.lte = args.filter.endTime;
      }

      return context.prisma.alertStatusRecord.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: args.pagination?.take || 50,
        skip: args.pagination?.skip || 0,
      });
    },
  },

  Mutation: {
    async acknowledgeAlert(_: any, args: { alertId: string }, context: ApolloContext) {
      if (!context.isAuthenticated) {
        throw new Error('Unauthorized');
      }

      return context.prisma.alertStatusRecord.update({
        where: { id: args.alertId },
        data: { lastUpdated: new Date() },
      });
    },

    async resolveAlert(_: any, args: { alertId: string }, context: ApolloContext) {
      if (!context.isAuthenticated) {
        throw new Error('Unauthorized');
      }

      return context.prisma.alertStatusRecord.update({
        where: { id: args.alertId },
        data: {
          isActive: false,
        },
      });
    },
  },

  Subscription: {
    alertStatusUpdated: {
      subscribe: async function* (_: any, __: any, context: ApolloContext) {
        // Emit current active alert
        const alert = await context.prisma.alertStatusRecord.findFirst({
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
        });

        if (alert) {
          yield { alertStatusUpdated: alert };
        }
      },
    },

    newGPSReading: {
      subscribe: async function* () {
        // Placeholder for real-time GPS reading subscription
        // In production, this would connect to a pub/sub system
        yield { newGPSReading: {} };
      },
    },
  },
};
