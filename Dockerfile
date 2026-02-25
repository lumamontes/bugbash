FROM node:20-slim AS base

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm build

# Production stage — slim, only runtime deps
FROM node:20-slim AS production

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/
RUN pnpm install --frozen-lockfile && rm -rf /root/.local/share/pnpm/store

COPY --from=base /app/dist ./dist
COPY --from=base /app/drizzle ./drizzle
COPY --from=base /app/scripts ./scripts
COPY --from=base /app/src ./src
COPY --from=base /app/tsconfig.json ./tsconfig.json
COPY --from=base /app/drizzle.config.ts ./drizzle.config.ts

# Data and uploads directories (mount volumes here)
RUN mkdir -p /app/data /app/uploads

ENV HOST=0.0.0.0
ENV NODE_ENV=production

EXPOSE 8080

CMD ["node", "dist/server/entry.mjs"]
