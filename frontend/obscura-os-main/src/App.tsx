import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { WagmiProvider } from "wagmi";
import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { DynamicWagmiConnector } from "@dynamic-labs/wagmi-connector";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { config } from "@/config/wagmi";
import Index from "./pages/Index.tsx";
import PayPage from "./pages/PayPage.tsx";
import DocsPage from "./pages/DocsPage.tsx";
import PrivacyPage from "./pages/PrivacyPage.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <DynamicContextProvider
    settings={{
      environmentId: 'ad372e3a-dd10-4268-92c4-d0c7435ceab0',
      walletConnectors: [EthereumWalletConnectors],
    }}
  >
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <DynamicWagmiConnector>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/pay" element={<PayPage />} />
                <Route path="/docs" element={<DocsPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </DynamicWagmiConnector>
      </QueryClientProvider>
    </WagmiProvider>
  </DynamicContextProvider>
);

export default App;
