import type { ApolloContext } from '../types/context.js';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '@utils/jwt.js';
import prisma from '@lib/prisma.js';
import { childLogger } from '@utils/logger.js';
import bcrypt from 'bcryptjs';

const log = childLogger('auth-resolver');

export const authResolvers = {
  Query: {
    async me(_: any, __: any, context: ApolloContext) {
      if (!context.isAuthenticated || !context.user) {
        return null;
      }
      return prisma.user.findUnique({
        where: { id: context.user.userId },
        include: { preferences: true },
      });
    },
  },

  Mutation: {
    async signup(
      _: any,
      args: { email: string; password: string; name: string },
      context: ApolloContext,
    ) {
      try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: { email: args.email },
        });

        if (existingUser) {
          throw new Error('User with this email already exists');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(args.password, 10);

        // Create user in database
        const user = await prisma.user.create({
          data: {
            email: args.email,
            displayName: args.name,
            password: hashedPassword,
            role: 'VIEWER', // Default role
            isActive: true,
            preferences: {
              create: {
                alertTypes: ['WATCH', 'WARNING', 'ALERT'],
                monitoredRegions: [],
              },
            },
          },
          include: { preferences: true },
        });

        // Generate JWT token
        const token = generateToken({
          userId: user.id,
          email: user.email,
          role: user.role,
        });

        const refreshToken = generateRefreshToken(user.id);

        // Store refresh token
        await prisma.refreshToken.create({
          data: {
            userId: user.id,
            token: refreshToken,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          },
        });

        log.info(`New user registered: ${user.email}`);

        return {
          token,
          refreshToken,
          expiresIn: 86400, // 24 hours in seconds
          user,
        };
      } catch (error) {
        log.error(error, 'Signup failed');
        throw new Error(error instanceof Error ? error.message : 'Signup failed');
      }
    },

    async login(_: any, args: { email: string; password: string }, context: ApolloContext) {
      try {
        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email: args.email },
          include: { preferences: true },
        });

        if (!user || !user.password) {
          throw new Error('Invalid email or password');
        }

        if (!user.isActive) {
          throw new Error('User account is inactive');
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(args.password, user.password);
        if (!isPasswordValid) {
          throw new Error('Invalid email or password');
        }

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        // Generate JWT token
        const token = generateToken({
          userId: user.id,
          email: user.email,
          role: user.role,
        });

        const refreshToken = generateRefreshToken(user.id);

        // Store refresh token
        await prisma.refreshToken.create({
          data: {
            userId: user.id,
            token: refreshToken,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          },
        });

        log.info(`User logged in: ${user.email}`);

        return {
          token,
          refreshToken,
          expiresIn: 86400, // 24 hours in seconds
          user,
        };
      } catch (error) {
        log.error(error, 'Login failed');
        throw new Error(error instanceof Error ? error.message : 'Login failed');
      }
    },

    async refreshToken(_: any, args: { refreshToken: string }, context: ApolloContext) {
      try {
        // Verify the refresh token
        const decoded = verifyRefreshToken(args.refreshToken);
        if (!decoded) {
          throw new Error('Invalid refresh token');
        }

        // Check if token exists and not revoked
        const tokenRecord = await prisma.refreshToken.findUnique({
          where: { token: args.refreshToken },
        });

        if (!tokenRecord || tokenRecord.revokedAt || tokenRecord.expiresAt < new Date()) {
          throw new Error('Refresh token expired or revoked');
        }

        // Get user
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          include: { preferences: true },
        });

        if (!user || !user.isActive) {
          throw new Error('User not found or inactive');
        }

        // Generate new tokens
        const newToken = generateToken({
          userId: user.id,
          email: user.email,
          role: user.role,
        });

        const newRefreshToken = generateRefreshToken(user.id);

        // Invalidate old refresh token and create new one
        await Promise.all([
          prisma.refreshToken.update({
            where: { token: args.refreshToken },
            data: { revokedAt: new Date() },
          }),
          prisma.refreshToken.create({
            data: {
              userId: user.id,
              token: newRefreshToken,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          }),
        ]);

        log.info(`Token refreshed for user: ${user.email}`);

        return {
          token: newToken,
          refreshToken: newRefreshToken,
          expiresIn: 86400,
          user,
        };
      } catch (error) {
        log.error(error, 'Token refresh failed');
        throw new Error('Token refresh failed');
      }
    },

    async logout(_: any, __: any, context: ApolloContext) {
      try {
        if (!context.isAuthenticated || !context.user) {
          throw new Error('Unauthorized');
        }

        // Revoke all refresh tokens for this user
        await prisma.refreshToken.updateMany({
          where: { userId: context.user.userId },
          data: { revokedAt: new Date() },
        });

        log.info(`User logged out: ${context.user.userId}`);

        return true;
      } catch (error) {
        log.error(error, 'Logout failed');
        throw new Error('Logout failed');
      }
    },
  },
};
