# ----------------------
# Base Stage
# ----------------------
FROM node:22-alpine AS base

# Clean app directory if exists
RUN rm -rf /app && mkdir /app

# Set environment variables (default to production)
ENV NODE_ENV=production

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json /app/
RUN npm ci && npm cache clean --force

# Copy prisma schema so prisma commands work
COPY prisma ./prisma

# Generate prisma client
RUN npx prisma generate

# ----------------------
# Development stage
# ----------------------
FROM base AS development

# Set environment variables to development
ENV NODE_ENV=development

# Copy source code
COPY . /app/

# Expose dev port
EXPOSE 7300

# Run migrations before start
CMD [ "sh", "-c", "npx prisma migrate deploy && npm start" ]

# ----------------------
# Production Stage
# ----------------------
FROM base AS production

# Set environment variables to production
ENV NODE_ENV=production

# Copy source code
COPY . /app/

# Expose dev port
EXPOSE 7300

# Run migrations before start
CMD [ "sh", "-c", "npx prisma migrate deploy && npm start" ]
