import SpadeLandingNav from "@/components/landing/spade/SpadeLandingNav";
import SpadeHeroSection from "@/components/landing/spade/SpadeHeroSection";
import DevelopersSection from "@/components/landing/spade/DevelopersSection";
import IntegrationsScrollSection from "@/components/landing/spade/IntegrationsScrollSection";
import SpadeFooter from "@/components/landing/spade/SpadeFooter";
import { LogoStrip } from "@/components/landing/vault/LogoStrip";
import { ScrollStory } from "@/components/landing/vault/ScrollStory";
import { EncryptionStory } from "@/components/landing/vault/EncryptionStory";
import { ProductEcosystem } from "@/components/landing/vault/ProductEcosystem";
import { PrivacyLanguage } from "@/components/landing/vault/PrivacyLanguage";
import { SecurityFoundation } from "@/components/landing/vault/SecurityFoundation";
import { Testimonials } from "@/components/landing/vault/Testimonials";
import { Stats } from "@/components/landing/vault/Stats";

const Index = () => {
  return (
    <div className="landing-spade min-h-screen">
      <SpadeLandingNav />
      <SpadeHeroSection />

      <div className="landing-vault">
        <LogoStrip />
        <DevelopersSection />
        <IntegrationsScrollSection />
        <ScrollStory />
        <EncryptionStory />
        <ProductEcosystem />
        <PrivacyLanguage />
        <SecurityFoundation />
        <Testimonials />
        <Stats />
      </div>

      <SpadeFooter />
    </div>
  );
};

export default Index;
