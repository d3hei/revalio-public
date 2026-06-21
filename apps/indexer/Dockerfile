# Build context is the REPO ROOT (root .dockerignore excludes apps/indexer/target).
#   docker build -f apps/indexer/Dockerfile -t revalio-indexer .
#
# NOTE: the first build is LARGE and SLOW (10–30 min): it pulls the Sui indexer
# framework from git and compiles the full Sui type stack. Subsequent builds are
# cached. The crate uses Diesel's libpq-based `postgres` backend, so the build
# image needs libpq-dev and the runtime needs libpq5. protoc/cmake/clang are
# required by transitive Sui crates.

FROM rust:1-bookworm AS build
RUN apt-get update && apt-get install -y --no-install-recommends \
        protobuf-compiler \
        libpq-dev \
        pkg-config \
        cmake \
        clang \
        libclang-dev \
        libssl-dev \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# Migrations are embedded at compile time (embed_migrations!), so they must be
# present in the build context.
COPY apps/indexer ./
RUN cargo build --release --locked

FROM debian:bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq5 \
        libstdc++6 \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/target/release/revalio-indexer /usr/local/bin/revalio-indexer
# Prometheus metrics (framework default).
EXPOSE 9184
# Default for `docker run`; docker-compose overrides this to add live-tail logic.
CMD ["revalio-indexer", "--rpc-api-url", "https://fullnode.testnet.sui.io:443"]
