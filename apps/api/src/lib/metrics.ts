import client from "prom-client";
import { pool } from "../db.js";
import { setUpstreamRecorder, type UpstreamOutcome } from "./http.js";

// Single registry for the whole process. Default Node/process metrics
// (event-loop lag, heap, GC, etc.) are collected at scrape time.
export const registry = new client.Registry();
registry.setDefaultLabels({ app: "revalio-api" });
client.collectDefaultMetrics({ register: registry });

export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request latency in seconds, by method/route/status.",
  labelNames: ["method", "route", "status_code"] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [registry],
});

export const upstreamRequests = new client.Counter({
  name: "upstream_requests_total",
  help: "Outcomes of outbound upstream HTTP calls (Pyth/CoinGecko/Sui RPC).",
  labelNames: ["host", "outcome"] as const,
  registers: [registry],
});

function recordUpstream(host: string, outcome: UpstreamOutcome): void {
  upstreamRequests.labels(host, outcome).inc();
}

// Wire fetchJson's observability hook to the registry.
setUpstreamRecorder(recordUpstream);

// Postgres pool connection counts, sampled at scrape time.
const dbPoolGauge = new client.Gauge({
  name: "db_pool_connections",
  help: "Postgres pool connection counts by state.",
  labelNames: ["state"] as const,
  registers: [registry],
  collect() {
    dbPoolGauge.labels("total").set(pool.totalCount);
    dbPoolGauge.labels("idle").set(pool.idleCount);
    dbPoolGauge.labels("waiting").set(pool.waitingCount);
  },
});
