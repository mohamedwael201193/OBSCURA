import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
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
import CreditPage from "./pages/CreditPage.tsx";
import PMFPage from "./pages/PMFPage.tsx";
import ContactsPage from "./pages/ContactsPage.tsx";
import SettingsPage from "./pages/SettingsPage.tsx";
import { PreferencesProvider } from "@/contexts/PreferencesContext";
import HowCoFHEModal from "@/components/shared/HowCoFHEModal";

const ONBOARDING_KEY = "obscura.onboarding.cofhe.v1";

const queryClient = new QueryClient();

/** Dashboard paths have a sidebar — hide the logo from the top nav there to avoid duplication. */
const DASHBOARD_PATHS = new Set(["/pay", "/pay/contacts", "/pay/settings", "/vote", "/credit"]);

const AnimatedRoutes = () => {
  const location = useLocation();
  const isDashboard = DASHBOARD_PATHS.has(location.pathname);

  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (location.pathname === "/credit" && !localStorage.getItem(ONBOARDING_KEY)) {
      // Small delay so the page paint finishes first
      const t = setTimeout(() => setShowOnboarding(true), 600);
      return () => clearTimeout(t);
    }
  }, [location.pathname]);

  const handleOnboardingClose = () => {
    localStorage.setItem(ONBOARDING_KEY, "1");
    setShowOnboarding(false);
  };

  return (
    <>
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
              <Route path="/pay/contacts" element={<ContactsPage />} />
              <Route path="/pay/settings" element={<SettingsPage />} />
              <Route path="/vote" element={<VotePage />} />
              <Route path="/credit" element={<CreditPage />} />
              <Route path="/docs" element={<DocsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/pmf" element={<PMFPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </motion.div>
        </AnimatePresence>

      </div>

      <HowCoFHEModal open={showOnboarding} onClose={handleOnboardingClose} />
    </>
  );
};

const App = () => (
  <WagmiProvider config={config}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <PreferencesProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AnimatedRoutes />
          </BrowserRouter>
        </PreferencesProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </WagmiProvider>
);

export default App;
