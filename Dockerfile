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

# Command to serve for development
CMD ["npm", "run", "dev"]

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

# Command to serve for production
CMD ["node", "server.js"]
