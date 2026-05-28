# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY ../../pnpm-workspace.yaml ./
COPY ../../tsconfig.base.json ./

# Copy all workspace packages
COPY ../../lib ./lib
COPY . .

# Install dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Build the API server
RUN pnpm --filter=api-server run build

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY ../../pnpm-workspace.yaml ./

# Copy all workspace packages
COPY ../../lib ./lib
COPY . .

# Install production dependencies only
RUN npm install -g pnpm && pnpm install --frozen-lockfile --prod

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 5000

# Start the app
CMD ["node", "dist/index.mjs"]
