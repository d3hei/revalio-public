import { resolveDefiPositions } from "../src/lib/positions/resolve.js";
import { inspectNativeSuilend } from "../src/lib/positions/sources/native/suilendRpc.js";
import { defiRpcCall, fetchOwnedObjectsByFilter } from "../src/lib/positions/sources/native/rpcClient.js";
import { suilendCapFilter } from "../src/lib/positions/sources/native/suilendPackages.js";

const addr = process.argv[2] ?? "0x65cfe14bdf5fdcba512a2f20586c2738f8d2e2e277e3fdb880619ed2b4edf73d";

async function main() {
  const suilend = await inspectNativeSuilend(addr);
  console.log("inspectNativeSuilend", JSON.stringify(suilend, null, 2));

  const caps = await fetchOwnedObjectsByFilter(addr, suilendCapFilter(), 4);
  console.log("caps", caps.length, caps.map((c) => c.type));

  // Scan owned objects for any Suilend cap type suffix.
  const body = await defiRpcCall<{
    result?: { data?: { data?: { type?: string; objectId?: string } }[]; nextCursor?: string | null };
  }>({
    jsonrpc: "2.0",
    id: 1,
    method: "suix_getOwnedObjects",
    params: [addr, { options: { showType: true, showContent: true } }, null, 50],
  });

  const suilendTypes =
    body?.result?.data
      ?.map((row) => row.data)
      .filter((d) => d?.type?.includes("ObligationOwnerCap") || d?.type?.includes("suilend"))
      .map((d) => ({ objectId: d?.objectId, type: d?.type })) ?? [];
  console.log("owned suilend-related", suilendTypes);

  const defi = await resolveDefiPositions(addr);
  console.log(
    "suilend rows",
    defi.filter((p) => p.protocol === "Suilend").map((p) => ({
      label: p.label,
      valueUsd: p.valueUsd,
      positionType: p.positionType,
    })),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
