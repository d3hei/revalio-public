import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App.js";
import { WalletProviders } from "./providers/WalletProviders.js";
import "@mysten/dapp-kit/dist/index.css";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <WalletProviders>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </WalletProviders>
    </QueryClientProvider>
  </React.StrictMode>,
);
