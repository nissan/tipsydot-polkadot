import { StrictMode, Suspense, useState } from "react";
import { createRoot } from "react-dom/client";
import { config } from "./reactive-dot.ts";
import { ReactiveDotProvider, ChainProvider } from "@reactive-dot/react";
import { type ChainId } from "@reactive-dot/core";

import "./index.css";
import App from "./App.tsx";
import Loading from "./components/Loading.tsx";

function ChainSelectAppWrapper() {
  const [chainId, setChainId] = useState<ChainId>("paseo");

  return (
    <ChainProvider key={chainId} chainId={chainId}>
      <Suspense fallback={<Loading />}>
        <App chainId={chainId} setChainId={setChainId} />
      </Suspense>
    </ChainProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ReactiveDotProvider config={config}>
      <ChainSelectAppWrapper />
    </ReactiveDotProvider>
  </StrictMode>,
);
