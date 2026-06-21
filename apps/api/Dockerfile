# Build context is the REPO ROOT (so the pnpm workspace + lockfile are visible).
#   docker build -f apps/api/Dockerfile -t revalio-api .
# (docker-compose handles this via build.context: . / build.dockerfile)

FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app

# --- install + build (with dev deps) ---
FROM base AS build
# Copy all workspace manifests first (frozen install validates the whole
# workspace against the lockfile) for better layer caching.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile --filter @revalio/api...
COPY apps/api apps/api
RUN pnpm --filter @revalio/api build
# Produce a self-contained dir with only production deps (real, un-symlinked
# node_modules) — the pnpm-recommended pattern for Docker images.
RUN pnpm --filter @revalio/api deploy --prod /prod/api

# --- runtime ---
FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /prod/api
COPY --from=build /prod/api ./
EXPOSE 3001
CMD ["node", "dist/index.js"]
