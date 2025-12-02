# Multi-stage build for Node.js Egg.js application
FROM node:22.18.0-alpine AS builder

# Install dependencies required for canvas and native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev \
    libpng-dev

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install ALL dependencies (including devDependencies for building)
RUN npm ci --legacy-peer-deps && \
    npm cache clean --force

# Copy TypeScript config and source code
COPY tsconfig.json ./
COPY app ./app
COPY config ./config

# Build TypeScript
RUN npm run build

# Remove devDependencies after build
RUN npm prune --omit=dev --legacy-peer-deps

# Production stage
FROM node:22.18.0-alpine

# Install runtime dependencies for canvas
RUN apk add --no-cache \
    cairo \
    jpeg \
    pango \
    giflib \
    pixman \
    libpng \
    ttf-dejavu \
    ttf-droid \
    ttf-freefont \
    ttf-liberation

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy dependencies from builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy built files and necessary configs
COPY --from=builder --chown=nodejs:nodejs /app/app ./app
COPY --from=builder --chown=nodejs:nodejs /app/config ./config
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Create logs directory with proper permissions
RUN mkdir -p logs && \
    chown -R nodejs:nodejs logs

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 7001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:7001', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["npm", "start"]

