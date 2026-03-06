import { ApolloServer, type ApolloServerPlugin } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { makeExecutableSchema } from '@graphql-tools/schema';
import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { typeDefs } from '@schemas/typeDefs.js';
import { alertResolvers } from '@resolvers/alert.js';
import { gpsResolvers } from '@resolvers/gps.js';
import { satelliteResolvers } from '@resolvers/satellite.js';
import { authResolvers } from '@resolvers/auth.js';
import { createContext } from '../types/context.js';
import type { ApolloContext } from '../types/context.js';
import { verifyToken } from '@utils/jwt.js';
import { childLogger } from '@utils/logger.js';

const log = childLogger('apollo-server');

const resolvers = {
  Query: {
    ...authResolvers.Query,
    ...alertResolvers.Query,
    ...gpsResolvers.Query,
    ...satelliteResolvers.Query,
  },
  Mutation: {
    ...authResolvers.Mutation,
    ...alertResolvers.Mutation,
  },
  Subscription: {
    ...alertResolvers.Subscription,
    ...gpsResolvers.Subscription,
    ...satelliteResolvers.Subscription,
  },
  User: {
    name: (parent: any) => parent.displayName ?? parent.name ?? null,
    avatar: (parent: any) => parent.photoURL ?? parent.avatar ?? null,
  },
  UserPreferences: {
    regions: (parent: any) => parent.monitoredRegions ?? parent.regions ?? [],
  },
};

export const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

export const createApolloServer = async (httpServer: any): Promise<ApolloServer<ApolloContext>> => {
  const plugins: ApolloServerPlugin<ApolloContext>[] = [
    {
      async serverWillStart() {
        // WebSocket setup
        const wsServer = new WebSocketServer({ server: httpServer, path: '/graphql' });
        useServer({ schema }, wsServer);

        log.info('WebSocket server started');

        return {
          async drainServer() {
            await new Promise<void>((resolve) => {
              wsServer.close(() => {
                resolve();
              });
            });
          },
        };
      },
    },
  ];

  const server = new ApolloServer<ApolloContext>({
    schema,
    plugins,
  });

  await server.start();
  return server;
};

export const setupExpressApp = (app: Express, server: ApolloServer) => {
  // Middleware setup
  app.use(helmet());

  const rawOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
  const allowedOrigins = rawOrigin === '*'
    ? '*'
    : rawOrigin.split(',').map((o) => o.trim());

  app.use(
    cors({
      origin: allowedOrigins,
      credentials: allowedOrigins !== '*',
    }),
  );
  app.use(pinoHttp({ logger: pino() }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Ready check endpoint
  app.get('/ready', (_req, res) => {
    res.json({ status: 'ready', timestamp: new Date().toISOString() });
  });

  // GraphQL middleware with auth
  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req }) => {
        const context = await createContext(req);

        // Extract and verify token
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (token) {
          const decoded = verifyToken(token);
          if (decoded) {
            context.user = decoded;
            context.isAuthenticated = true;
            context.userId = decoded.userId;
          }
        }

        return context;
      },
    }),
  );

  return app;
};
