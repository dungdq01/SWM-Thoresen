import { 
  Header, 
  HeroSection, 
  PartnersSection, 
  FeaturesSection, 
  MobileAppSection,
  WhyChooseUsSection,
  CTASection,
  Footer 
} from '@/widgets/landing'

export function LandingPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection />
        <PartnersSection />
        <FeaturesSection />
        <MobileAppSection />
        <WhyChooseUsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}
