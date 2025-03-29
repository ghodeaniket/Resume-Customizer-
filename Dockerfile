# Multi-stage build for better production images

# ---- Base Node ----
FROM node:18-alpine AS base
WORKDIR /usr/src/app
# Add Docker gRPC health probe
RUN wget -qO/bin/grpc_health_probe https://github.com/grpc-ecosystem/grpc-health-probe/releases/download/v0.4.17/grpc_health_probe-linux-amd64 && \
    chmod +x /bin/grpc_health_probe
# Add curl for healthcheck and dependencies for Puppeteer
RUN apk --no-cache add curl \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    # Dependencies for Bull/Redis
    redis
# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# ---- Dependencies ----
FROM base AS dependencies
# Copy package.json and package-lock.json
COPY package*.json ./
# Add build dependencies
RUN apk add --no-cache --virtual .build-deps make gcc g++ python3 py3-pip
# Install all dependencies (including dev)
RUN npm ci
# Remove build dependencies
RUN apk del .build-deps
# Copy project files
COPY . .

# ---- Development ----
FROM dependencies AS development
# Set NODE_ENV
ENV NODE_ENV=development
# Expose the port
EXPOSE 3000
# Command for development
CMD ["npm", "run", "dev"]

# ---- Build for production ----
FROM dependencies AS build
# Build the application
RUN npm run build --if-present
# Install production dependencies only
RUN npm ci --only=production

# ---- Production ----
FROM base AS production
# Set NODE_ENV
ENV NODE_ENV=production
# Copy production dependencies and build from 'build' stage
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/src ./src
COPY --from=build /usr/src/app/package*.json ./
# Copy necessary configuration files
COPY --from=build /usr/src/app/.sequelizerc ./
COPY --from=build /usr/src/app/src/migrations ./src/migrations
COPY --from=build /usr/src/app/src/seeders ./src/seeders
# Expose the port
EXPOSE 3000
# Run migrations and start application
CMD ["sh", "-c", "npm run db:migrate && node src/app.js"]

# Default to development stage if not specified
FROM development
