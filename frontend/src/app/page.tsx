import { PublicLayout } from "@/components/layout/public-layout";
import { BlogPreviewSection } from "@/components/website/blog-preview-section";
import { ContactSection } from "@/components/website/contact-section";
import { FloatingStats } from "@/components/website/floating-stats";
import { HomeHero } from "@/components/website/home-hero";
import { ProcessSection } from "@/components/website/process-section";
import { ServicePreviewSection } from "@/components/website/service-preview-section";
import { StaffPreviewSection } from "@/components/website/staff-preview-section";
import { TestimonialsSection } from "@/components/website/testimonials-section";
import { ValuesSection } from "@/components/website/values-section";

export default function HomePage() {
  return (
    <PublicLayout>
      <HomeHero />
       <FloatingStats />
      <ServicePreviewSection />
      <StaffPreviewSection />
      <ValuesSection />
      <ProcessSection />
      <TestimonialsSection />
      <BlogPreviewSection />
      <ContactSection />
    </PublicLayout>
  );
}