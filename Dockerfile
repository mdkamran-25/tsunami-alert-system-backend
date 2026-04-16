# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma

# Install ALL dependencies (including devDeps for build)
RUN npm install

# Generate Prisma client BEFORE TypeScript compilation
RUN npx prisma generate

# Copy source code
COPY src ./src

# Compile TypeScript
RUN npm run build

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init and OpenSSL (required by Prisma native engine)
RUN apk add --no-cache dumb-init openssl

# Copy package files
COPY package*.json ./
COPY prisma ./prisma

# Install production dependencies only
RUN npm install --omit=dev

# Generate Prisma client with explicit engine path
RUN npx prisma generate
RUN ls -la node_modules/.prisma/client/ || echo "Prisma client not found"

# Copy compiled JS and startup script
COPY --from=builder /app/dist ./dist
COPY start.sh ./start.sh
RUN chmod +x ./start.sh

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD node -e "require('http').get('http://localhost:4000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "start.sh"]
