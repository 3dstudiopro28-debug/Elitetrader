import { Header } from "@/components/header";
import { HeroSection } from "@/components/hero-section";
import { FeaturesSection } from "@/components/features-section";
import { StepsSection } from "@/components/steps-section";
import { TestimonialsSection } from "@/components/testimonials-section";
import { PlatformSection } from "@/components/platform-section";
import { MarketsSection } from "@/components/markets-section";
import { ConditionsSection } from "@/components/conditions-section";
import { CTASection } from "@/components/cta-section";
import { Footer } from "@/components/footer";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Header />
      <HeroSection />
      <FeaturesSection />
      <StepsSection />
      <TestimonialsSection />
      <PlatformSection />
      <MarketsSection />
      <ConditionsSection />
      <CTASection />
      <Footer />
    </main>
  );
}
