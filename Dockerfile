# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Copy server files needed for migrations
COPY --from=builder /app/server/knexfile.ts ./server/knexfile.ts
COPY --from=builder /app/server/migrations ./server/migrations

# Install tsx for running TypeScript migration files
RUN pnpm add -g tsx

# Create entrypoint script
RUN echo '#!/bin/sh' > /entrypoint.sh && \
    echo 'echo "Running database migrations..."' >> /entrypoint.sh && \
    echo 'tsx node_modules/knex/bin/cli.js migrate:latest --knexfile server/knexfile.ts' >> /entrypoint.sh && \
    echo 'echo "Starting server..."' >> /entrypoint.sh && \
    echo 'exec node dist/server/node-build.mjs' >> /entrypoint.sh && \
    chmod +x /entrypoint.sh

# Expose port
EXPOSE 8080

# Use entrypoint script
ENTRYPOINT ["/entrypoint.sh"]
