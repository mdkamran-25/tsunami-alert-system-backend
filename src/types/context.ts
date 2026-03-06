import { BaseContext } from '@apollo/server';
import { TokenPayload } from '@utils/jwt.js';
import prisma from '@lib/prisma.js';

export interface ApolloContext extends BaseContext {
  user?: TokenPayload;
  prisma: typeof prisma;
  isAuthenticated: boolean;
  userId?: string;
}

export const createContext = async (req?: any): Promise<ApolloContext> => {
  const token = req?.headers?.authorization?.replace('Bearer ', '');

  // Note: Token verification will be done in middleware
  // This is just the context structure

  return {
    user: undefined,
    prisma,
    isAuthenticated: !!token,
    userId: undefined,
  };
};
