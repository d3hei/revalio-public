# Build context is the REPO ROOT (pnpm workspace + lockfile).
#   docker build -f apps/web/Dockerfile -t revalio-web .

FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app

# --- build the static bundle ---
FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile --filter @revalio/web...
COPY apps/web apps/web
# Same-origin "/api" is proxied by nginx at runtime, so no API base is baked in.
RUN pnpm --filter @revalio/web build

# --- serve via nginx (also reverse-proxies /api -> api service) ---
FROM nginx:1.27-alpine AS runtime
COPY infra/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
