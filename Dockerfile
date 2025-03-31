# Multi-stage build for better production images
# Resume Customizer Backend API

# ---- Base Node ----
FROM node:20.11-alpine AS base
WORKDIR /usr/src/app

# Add metadata
LABEL maintainer="Resume Customizer Team"
LABEL description="Backend API for resume customizer application"
LABEL version="1.0.0"

# Add health probe and required dependencies
RUN apk --no-cache add curl wget \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    redis

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# ---- Dependencies ----
FROM base AS dependencies
COPY package*.json ./

# Add build dependencies and install all dependencies (including dev)
RUN apk add --no-cache --virtual .build-deps make gcc g++ python3 py3-pip && \
    npm ci && \
    apk del .build-deps

# ---- Development ----
FROM dependencies AS development
# Copy project files
COPY . .
# Set NODE_ENV
ENV NODE_ENV=development
# Expose the port
EXPOSE 3000
# Command for development with hot reload
CMD ["npx", "nodemon", "--legacy-watch", "src/app.js"]

# ---- Build for production ----
FROM dependencies AS build
COPY . .
# Prune dev dependencies and prepare for production
RUN npm prune --production && \
    npm run build --if-present

# ---- Production ----
FROM base AS production
# Set NODE_ENV
ENV NODE_ENV=production

# Copy production dependencies and app files
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/src ./src
COPY --from=build /usr/src/app/package*.json ./
COPY --from=build /usr/src/app/.sequelizerc ./.sequelizerc
COPY --from=build /usr/src/app/src/migrations ./src/migrations
COPY --from=build /usr/src/app/src/seeders ./src/seeders

# Create a non-root user and set permissions
RUN addgroup -S appgroup && \
    adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /usr/src/app

# Use the non-root user for running the application
USER appuser

# Expose the port
EXPOSE 3000

# Set healthcheck
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Run migrations and start application
CMD ["sh", "-c", "npm run db:migrate && node src/app.js"]