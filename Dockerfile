# Use Node.js LTS version
FROM node:20-alpine

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install

# Copy app source
COPY . .

# Expose port
EXPOSE 5000

# Start command
CMD ["pnpm", "start"] 