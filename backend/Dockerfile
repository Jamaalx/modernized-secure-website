# Backend Dockerfile - Production-ready Node.js application
# Multi-stage build for optimal security and performance

# Stage 1: Build stage
FROM node:20.19.0-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && ln -sf python3 /usr/bin/python

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# Copy source code
COPY . .

# Remove development files
RUN rm -rf src/test/ \
    && rm -f .env.example \
    && rm -f README.md \
    && rm -f *.config.js

# Stage 2: Production stage
FROM node:20.19.0-alpine AS production

# Install security updates and required packages
RUN apk update && \
    apk upgrade && \
    apk add --no-cache \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S backend -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=backend:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=backend:nodejs /app/src ./src
COPY --from=builder --chown=backend:nodejs /app/package*.json ./

# Create necessary directories
RUN mkdir -p logs uploads && \
    chown -R backend:nodejs logs uploads

# Set environment variables
ENV NODE_ENV=production \
    PORT=3001 \
    LOG_LEVEL=info \
    UPLOAD_PATH=/app/uploads

# Switch to non-root user
USER backend

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "src/server.js"]

# Labels for better container management
LABEL maintainer="your-team@company.com" \
      version="2.0.0" \
      description="Secure Documents Backend - Production Ready" \
      org.opencontainers.image.title="secure-docs-backend" \
      org.opencontainers.image.description="Secure document sharing platform backend" \
      org.opencontainers.image.version="2.0.0" \
      org.opencontainers.image.vendor="Your Company" \
      org.opencontainers.image.licenses="MIT"

