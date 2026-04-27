import HeroSection from "@/components/HeroSection";
import FeaturesGrid from "@/components/FeaturesGrid";
import WaveModules from "@/components/WaveModules";
import ArchitectureDiagram from "@/components/ArchitectureDiagram";
import PrivacyPanel from "@/components/PrivacyPanel";
import TechStack from "@/components/TechStack";
import PitchCTA from "@/components/PitchCTA";
import ObscuraFooter from "@/components/ObscuraFooter";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <HeroSection />
      <FeaturesGrid />
      <WaveModules />
      <ArchitectureDiagram />
      <PrivacyPanel />
      <TechStack />
      <PitchCTA />
      <ObscuraFooter />
    </div>
  );
};

export default Index;
