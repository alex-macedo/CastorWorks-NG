import { Navigation } from "@/components/landing/navigation"
import { HeroSection } from "@/components/landing/hero-section"
import { FeaturesSection } from "@/components/landing/features-section"
import { AISection } from "@/components/landing/ai-section"
import { SegmentsSection } from "@/components/landing/segments-section"
import { TestimonialSection } from "@/components/landing/testimonial-section"
import { CTASection } from "@/components/landing/cta-section"
import { Footer } from "@/components/landing/footer"

export default function LandingPage() {
  return (
    <main data-page="castorworks-landing" className="min-h-screen bg-background">
      <Navigation />
      <HeroSection />
      <FeaturesSection />
      <AISection />
      <SegmentsSection />
      <TestimonialSection />
      <CTASection />
      <Footer />
    </main>
  )
}
