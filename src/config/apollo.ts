import { ApolloServer, type ApolloServerPlugin } from '@apollo/server';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
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
import { systemResolvers } from '@resolvers/system.js';
import { adminResolvers } from '@resolvers/admin.js';
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
    ...systemResolvers.Query,
    ...adminResolvers.Query,
  },
  Mutation: {
    ...authResolvers.Mutation,
    ...alertResolvers.Mutation,
    ...adminResolvers.Mutation,
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
    // Enable the embedded Apollo Sandbox in all environments (including production)
    introspection: true,
  });

  await server.start();
  return server;
};

export const setupExpressApp = (app: Express, server: ApolloServer) => {
  // Middleware setup – relaxed CSP so Apollo Sandbox iframe & landing page work
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  const rawOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
  const allowedOrigins = rawOrigin === '*' ? '*' : rawOrigin.split(',').map((o) => o.trim());

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

  // Root landing page with embedded Apollo Sandbox
  app.get('/', (_req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>🌊 Tsunami Alert API</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; }
    .header { background: linear-gradient(135deg, #0ea5e9, #10b981); padding: 24px 32px; display: flex; align-items: center; justify-content: space-between; }
    .header h1 { font-size: 1.5rem; color: white; }
    .header .badge { background: rgba(255,255,255,0.2); color: white; padding: 4px 12px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; }
    .nav { background: #1e293b; padding: 12px 32px; display: flex; gap: 16px; flex-wrap: wrap; }
    .nav a { color: #38bdf8; text-decoration: none; font-size: 0.875rem; padding: 6px 14px; border-radius: 6px; transition: background 0.2s; }
    .nav a:hover { background: #334155; }
    .nav a.primary { background: #0ea5e9; color: white; font-weight: 600; }
    .nav a.primary:hover { background: #0284c7; }
    .sandbox-container { width: 100%; height: calc(100vh - 120px); }
    iframe { width: 100%; height: 100%; border: none; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🌊 Tsunami Alert System — GraphQL API</h1>
    <span class="badge">LIVE</span>
  </div>
  <div class="nav">
    <a class="primary" href="/graphql" target="_blank">Open Apollo Sandbox ↗</a>
    <a href="/health">Health Check</a>
    <a href="/ready">Ready Check</a>
  </div>
  <div class="sandbox-container">
    <iframe src="https://sandbox.apollo.dev/?endpoint=${encodeURIComponent('https://tsunami-alert-backend-production.up.railway.app/graphql')}" />
  </div>
</body>
</html>`);
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
