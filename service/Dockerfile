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
    pixman-dev

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for building)
RUN npm ci && \
    npm cache clean --force

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Remove devDependencies after build
RUN npm prune --omit=dev

# Production stage
FROM node:22.18.0-alpine

# Install runtime dependencies for canvas
RUN apk add --no-cache \
    cairo \
    jpeg \
    pango \
    giflib \
    pixman

WORKDIR /app

# Copy dependencies from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy built files
COPY --from=builder /app/app ./app
COPY --from=builder /app/config ./config
COPY --from=builder /app/package*.json ./

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 7001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:7001', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["npm", "start"]

