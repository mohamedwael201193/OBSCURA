import SpadeLandingNav from "@/components/landing/spade/SpadeLandingNav";
import SpadeHeroSection from "@/components/landing/spade/SpadeHeroSection";
import DevelopersSection from "@/components/landing/spade/DevelopersSection";
import FigureShowcaseSection from "@/components/landing/spade/FigureShowcaseSection";
import IntegrationsScrollSection from "@/components/landing/spade/IntegrationsScrollSection";
import MobileAppSection from "@/components/landing/spade/MobileAppSection";
import SpadeFooter from "@/components/landing/spade/SpadeFooter";
import { LogoStrip } from "@/components/landing/vault/LogoStrip";
import { ScrollStory } from "@/components/landing/vault/ScrollStory";
import { EncryptionStory } from "@/components/landing/vault/EncryptionStory";
import { ProductEcosystem } from "@/components/landing/vault/ProductEcosystem";
import { PrivacyLanguage } from "@/components/landing/vault/PrivacyLanguage";
import { SecurityFoundation } from "@/components/landing/vault/SecurityFoundation";
import { PayProductSection } from "@/components/landing/vault/PayProductSection";
import { Stats } from "@/components/landing/vault/Stats";

const Index = () => {
  return (
    <div className="landing-spade min-h-screen">
      <SpadeLandingNav />
      <SpadeHeroSection />

      <div className="landing-vault">
        <LogoStrip />
        <DevelopersSection />
        <MobileAppSection />
        <FigureShowcaseSection />
        <IntegrationsScrollSection />
        <ScrollStory />
        <EncryptionStory />
        <ProductEcosystem />
        <PayProductSection />
        <PrivacyLanguage />
        <SecurityFoundation />
        <Stats />
      </div>

      <SpadeFooter />
    </div>
  );
};

export default Index;
