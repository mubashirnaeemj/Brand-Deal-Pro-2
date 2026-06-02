import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import ProblemStatement from "@/components/ProblemStatement";
import HowItWorks from "@/components/HowItWorks";
import Features from "@/components/Features";
import Pricing from "@/components/Pricing";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/30 selection:text-white">
      <Navbar />
      
      <main>
        <Hero />
        <ProblemStatement />
        <HowItWorks />
        <Features />
        <Pricing />
      </main>

      <Footer />
    </div>
  );
}
