import { useQuery } from "@tanstack/react-query";

async function pingApi(): Promise<boolean> {
  try {
    const res = await fetch("/api/health", { headers: { accept: "application/json" } });
    if (!res.ok) return false;
    const body = (await res.json()) as { status?: string };
    return body.status === "ok";
  } catch {
    return false;
  }
}

export function LabApiStatus() {
  const { data: online, isLoading } = useQuery({
    queryKey: ["api-health"],
    queryFn: pingApi,
    refetchInterval: 10_000,
    staleTime: 5_000,
  });

  if (isLoading) return null;
  if (online) return null;

  return (
    <div className="lab-api-banner" role="status">
      API is not reachable. Start it with{" "}
      <code>pnpm --filter @revalio/api dev</code> (port <strong>3001</strong>), then refresh.
    </div>
  );
}
