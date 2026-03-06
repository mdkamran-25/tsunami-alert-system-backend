import type { ApolloContext } from '../types/context.js';

export const requireAuth = (context: ApolloContext) => {
  if (!context.isAuthenticated || !context.user) {
    throw new Error('Unauthorized');
  }
  return context.user;
};

export const requireRole = (context: ApolloContext, roles: string[]) => {
  const user = requireAuth(context);
  if (!roles.includes(user.role)) {
    throw new Error('Forbidden');
  }
  return user;
};
