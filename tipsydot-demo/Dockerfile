# Multi-stage Dockerfile for TipsyDot

# Stage 1: Build Ink! contracts
FROM rust:1.75 AS ink-builder

# Install cargo-contract
RUN cargo install cargo-contract --version 4.1.1

# Copy Ink! contracts
WORKDIR /app/ink-contracts
COPY ink-contracts .

# Build contracts
RUN cargo contract build --release --manifest-path simple_test/Cargo.toml && \
    cargo contract build --release --manifest-path tipping_v6/Cargo.toml

# Stage 2: Build Solidity contracts
FROM ghcr.io/foundry-rs/foundry:latest AS solidity-builder

WORKDIR /app
COPY contracts contracts/
COPY foundry.toml .
COPY remappings.txt .

# Install dependencies and build
RUN forge install && forge build --sizes

# Stage 3: Build frontend
FROM node:20-alpine AS frontend-builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY . .

# Copy built contracts from previous stages
COPY --from=ink-builder /app/ink-contracts/target/ink ./ink-contracts/target/ink
COPY --from=solidity-builder /app/out ./out

# Build frontend
RUN pnpm build

# Stage 4: Production runtime
FROM node:20-alpine AS runtime

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

WORKDIR /app

# Copy built application
COPY --from=frontend-builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=frontend-builder /app/node_modules ./node_modules
COPY --from=frontend-builder /app/package.json ./package.json
COPY --from=frontend-builder /app/public ./public

# Copy contract artifacts
COPY --from=ink-builder --chown=nextjs:nodejs /app/ink-contracts/target/ink ./contracts/ink
COPY --from=solidity-builder --chown=nextjs:nodejs /app/out ./contracts/out

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV NODE_ENV production

CMD ["pnpm", "start"]

# Stage 5: Test runner (optional)
FROM node:20-alpine AS test-runner

# Install pnpm and browsers
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate && \
    apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

WORKDIR /app

# Copy everything
COPY --from=frontend-builder /app .

# Install Playwright browsers
RUN pnpm exec playwright install chromium

# Set environment variables for Playwright
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Run tests
CMD ["pnpm", "test:all"]
