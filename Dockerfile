# Backend-only Production Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy source and build files
COPY src ./src
COPY build ./build
COPY public ./public

# Create data directory
RUN mkdir -p /app/data

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Run backend directly with tsx
CMD ["npx", "tsx", "src/index.ts"]
