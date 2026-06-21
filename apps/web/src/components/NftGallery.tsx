import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getNfts, type NftItem } from "../api/client.js";
import { shortenAddress } from "../lib/sui.js";
import { shortenCoinType } from "../lib/coinType.js";

interface Props {
  address: string;
}

const PAGE_SIZE = 24;

function mergeUnique(prev: NftItem[], next: NftItem[]): NftItem[] {
  const out = [...prev];
  const seen = new Set(prev.map((i) => i.objectId));
  for (const item of next) {
    if (seen.has(item.objectId)) continue;
    seen.add(item.objectId);
    out.push(item);
  }
  return out;
}

export function NftGallery({ address }: Props) {
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(true);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [items, setItems] = useState<NftItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  useEffect(() => {
    setShowVerifiedOnly(true);
    setCursor(undefined);
    setItems([]);
    setNextCursor(null);
  }, [address]);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["nfts", address, cursor, PAGE_SIZE],
    queryFn: () => getNfts(address, cursor, PAGE_SIZE),
    enabled: Boolean(address),
  });

  useEffect(() => {
    if (!data) return;
    setItems((prev) => mergeUnique(prev, data.items));
    setNextCursor(data.nextCursor);
  }, [data]);

  const visibleItems = useMemo(
    () =>
      showVerifiedOnly
        ? items.filter((i) => i.verified || i.source === "kiosk")
        : items,
    [items, showVerifiedOnly],
  );
  const verifiedCount = useMemo(
    () => items.filter((i) => i.verified || i.source === "kiosk").length,
    [items],
  );
  const hasLoaded = useMemo(() => items.length > 0, [items.length]);

  if (isLoading && !hasLoaded) {
    return (
      <div className="card">
        <div className="card-header">NFT</div>
        <div className="state">
          <div className="spinner" />
          Loading NFTs…
        </div>
      </div>
    );
  }

  if (isError && !hasLoaded) {
    return (
      <div className="card">
        <div className="card-header">NFT</div>
        <div className="state error">
          Failed to load NFTs: {(error as Error).message}
          <button className="retry" onClick={() => void refetch()} disabled={isFetching}>
            {isFetching ? "Retrying…" : "Retry"}
          </button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="card">
        <div className="card-header">NFT</div>
        <div className="state">No NFTs found for {shortenAddress(address)}.</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header portfolio-header">
        <span>NFT</span>
        <button
          type="button"
          className={`nft-header-filter ${!showVerifiedOnly ? "active" : ""}`}
          onClick={() => setShowVerifiedOnly(false)}
        >
          All ({items.length})
        </button>
      </div>
      <div className="nft-filters">
        <button
          type="button"
          className={showVerifiedOnly ? "active" : ""}
          onClick={() => setShowVerifiedOnly(true)}
        >
          Verified ({verifiedCount})
        </button>
      </div>
      <div className="nft-grid">
        {visibleItems.map((item) => (
          <div className="nft-card" key={item.objectId}>
            <div className="nft-media">
              {item.imageUrl ? <img src={item.imageUrl} alt={item.name ?? "NFT"} loading="lazy" /> : <span>No image</span>}
            </div>
            <div className="nft-name">{item.name ?? "Untitled NFT"}</div>
            <div className="nft-meta">
              {item.collection ?? shortenCoinType(item.type)}
              {item.kioskId ? ` · kiosk ${shortenAddress(item.kioskId)}` : ""}
            </div>
          </div>
        ))}
      </div>
      <div className="pagination">
        <span className="pagination-info">{PAGE_SIZE} per page</span>
        <button
          type="button"
          className="pagination-btn"
          disabled={!nextCursor || isFetching}
          onClick={() => setCursor(nextCursor ?? undefined)}
        >
          {isFetching ? "Loading…" : nextCursor ? "Load more" : "All loaded"}
        </button>
      </div>
    </div>
  );
}

