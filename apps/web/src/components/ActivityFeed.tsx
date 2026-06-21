import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getActivity } from "../api/client.js";
import { EXPLORER_TX_BASE } from "../lib/network.js";
import { formatTimestamp } from "../lib/format.js";

interface Props {
  address: string;
}

const PAGE_SIZE = 20;

function shortenDigest(digest: string): string {
  return digest.length > 14 ? `${digest.slice(0, 8)}…${digest.slice(-6)}` : digest;
}

export function ActivityFeed({ address }: Props) {
  const [page, setPage] = useState(0);
  const [cursorByPage, setCursorByPage] = useState<(string | undefined)[]>([undefined]);

  useEffect(() => {
    setPage(0);
    setCursorByPage([undefined]);
  }, [address]);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["activity", address, page, PAGE_SIZE],
    queryFn: () => getActivity(address, cursorByPage[page], PAGE_SIZE),
    enabled: Boolean(address),
  });

  useEffect(() => {
    if (!data?.nextCursor) return;
    setCursorByPage((prev) => {
      if (prev[page + 1] === data.nextCursor) return prev;
      const next = [...prev];
      next[page + 1] = data.nextCursor ?? undefined;
      return next;
    });
  }, [data?.nextCursor, page]);

  if (isLoading) {
    return (
      <div className="card activity">
        <div className="card-header">Transactions</div>
        <div className="state">
          <div className="spinner" />
          Loading activity…
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="card activity">
        <div className="card-header">Transactions</div>
        <div className="state error">
          Failed to load activity: {(error as Error).message}
          <button className="retry" onClick={() => void refetch()} disabled={isFetching}>
            {isFetching ? "Retrying…" : "Retry"}
          </button>
        </div>
      </div>
    );
  }

  const items = data?.items ?? [];

  if (items.length === 0) {
    return (
      <div className="card activity">
        <div className="card-header">Transactions</div>
        <div className="state">No sent transactions found for this address.</div>
      </div>
    );
  }

  const hasNext = Boolean(data?.nextCursor);
  const hasPrev = page > 0;

  return (
    <div className="card activity">
      <div className="card-header activity-header">
        <span>Transactions</span>
        <span className="activity-page-label">Page {page + 1}</span>
      </div>
      {items.map((item) => (
        <div className="activity-row" key={item.txDigest}>
          <div className="activity-main">
            <span className="activity-kind">{item.kind ?? "Transaction"}</span>
            <a
              className="activity-digest"
              href={`${EXPLORER_TX_BASE}/${item.txDigest}`}
              target="_blank"
              rel="noreferrer"
            >
              {shortenDigest(item.txDigest)}
            </a>
          </div>
          <span className="activity-time">{formatTimestamp(item.timestampMs)}</span>
        </div>
      ))}
      <div className="pagination">
        <button
          type="button"
          className="pagination-btn"
          disabled={!hasPrev || isFetching}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          Previous
        </button>
        <span className="pagination-info">
          {PAGE_SIZE} per page
          {data?.source ? ` · ${data.source}` : ""}
        </span>
        <button
          type="button"
          className="pagination-btn"
          disabled={!hasNext || isFetching}
          onClick={() => setPage((p) => p + 1)}
        >
          {isFetching ? "Loading…" : "Next"}
        </button>
      </div>
    </div>
  );
}
