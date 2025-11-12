# Stage 1: Builder
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Stage 2: Development
FROM base AS development
ENV NODE_ENV=development
CMD ["npm", "run", "dev"]

# Stage 3: Production
FROM base AS production
ENV NODE_ENV=production
RUN npm prune --omit=dev
CMD ["npm", "start"]
