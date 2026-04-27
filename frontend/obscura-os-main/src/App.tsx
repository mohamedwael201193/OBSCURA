import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { WagmiProvider } from "wagmi";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { config } from "@/config/wagmi";
import GooeyNav from "@/components/elite/GooeyNav";
import NavRightSlot from "@/components/elite/NavRightSlot";
import Index from "./pages/Index.tsx";
import PayPage from "./pages/PayPage.tsx";
import DocsPage from "./pages/DocsPage.tsx";
import PrivacyPage from "./pages/PrivacyPage.tsx";
import NotFound from "./pages/NotFound.tsx";
import VotePage from "./pages/VotePage.tsx";
import PMFPage from "./pages/PMFPage.tsx";

const queryClient = new QueryClient();

/** Dashboard paths have a sidebar — hide the logo from the top nav there to avoid duplication. */
const DASHBOARD_PATHS = new Set(["/pay", "/vote"]);

const AnimatedRoutes = () => {
  const location = useLocation();
  const isDashboard = DASHBOARD_PATHS.has(location.pathname);

  return (
    <div className="min-h-screen bg-background">
      {/* Persistent nav — always mounted, never flickers during route transitions */}
      <GooeyNav rightSlot={<NavRightSlot />} />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeInOut" }}
        >
          <Routes location={location}>
            <Route path="/" element={<Index />} />
            <Route path="/pay" element={<PayPage />} />
            <Route path="/vote" element={<VotePage />} />
            <Route path="/docs" element={<DocsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/pmf" element={<PMFPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const App = () => (
  <WagmiProvider config={config}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AnimatedRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </WagmiProvider>
);

export default App;
