# Dockerfile (Place in root of ai-yako-studio)
FROM node:20-slim AS base

# Install Python and build essentials for better-sqlite3 and native addons
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy application code
COPY . .

# Build the Next.js production server
RUN npm run build

# Prefetch QVAC weights into the container image (optional, but speeds up boot)
RUN npm run prefetch-models

# Start the standalone Next.js server
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000
CMD ["npm", "start"]