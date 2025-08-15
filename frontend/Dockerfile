# Frontend Dockerfile - Production-ready React application
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
RUN npm ci --ignore-scripts && \
    npm cache clean --force

# Copy source code
COPY . .

# Build arguments for environment variables
ARG VITE_API_URL
ARG VITE_APP_NAME
ARG VITE_APP_VERSION

# Set build environment variables
ENV VITE_API_URL=${VITE_API_URL:-http://localhost:3001}
ENV VITE_APP_NAME=${VITE_APP_NAME:-"Secure Documents"}
ENV VITE_APP_VERSION=${VITE_APP_VERSION:-"2.0.0"}

# Build the application
RUN npm run build

# Stage 2: Production stage with Nginx
FROM nginx:1.25-alpine AS production

# Install security updates
RUN apk update && \
    apk upgrade && \
    apk add --no-cache \
    curl \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S frontend && \
    adduser -S frontend -u 1001 -G frontend

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY nginx-default.conf /etc/nginx/conf.d/default.conf

# Create necessary directories and set permissions
RUN mkdir -p /var/cache/nginx /var/log/nginx /var/run && \
    chown -R frontend:frontend /var/cache/nginx /var/log/nginx /var/run /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Switch to non-root user
USER frontend

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]

# Labels for better container management
LABEL maintainer="your-team@company.com" \
      version="2.0.0" \
      description="Secure Documents Frontend - Production Ready" \
      org.opencontainers.image.title="secure-docs-frontend" \
      org.opencontainers.image.description="Secure document sharing platform frontend" \
      org.opencontainers.image.version="2.0.0" \
      org.opencontainers.image.vendor="Your Company" \
      org.opencontainers.image.licenses="MIT"

