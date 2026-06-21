import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { BoltApp } from "./BoltApp.js";
import { WalletProviders } from "../providers/WalletProviders.js";
import "@mysten/dapp-kit/dist/index.css";
import "../fonts.css";
import "./bolt.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <WalletProviders>
        <BoltApp />
      </WalletProviders>
    </QueryClientProvider>
  </React.StrictMode>,
);
