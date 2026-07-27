import Navbar from "@/components/Navbar";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="container mx-auto px-6 pt-28 pb-20 max-w-3xl">
        <h1 className="text-3xl font-bold text-white mb-2">MAVLIT Terms of Service — Private Beta</h1>
        <p className="text-sm text-muted-foreground mb-12">Effective Date: July 27, 2026</p>

        <p className="text-muted-foreground leading-relaxed mb-12">
          These Terms govern your participation in the MAVLIT private beta program, operated by BWB Media Inc. ("MAVLIT," "we," "us"), a California corporation based in Newport Beach, California. By accessing the beta, you agree to these Terms.
        </p>

        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4">1. About the Beta</h2>
          <p className="text-muted-foreground leading-relaxed">
            MAVLIT is currently a limited, invitation-only private beta available to a small group of content creators we have personally invited. It is not available to the general public. Features, data, and functionality may change, be added, or be removed at any time without notice, and the beta may contain errors or incomplete functionality.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4">2. What MAVLIT Is</h2>
          <p className="text-muted-foreground leading-relaxed">
            MAVLIT is a software tool that provides creators with brand intelligence, brand-matching suggestions, contact information, and pitch-drafting assistance. MAVLIT is not a talent agency, talent manager, or legal service. We do not negotiate, broker, or take any percentage of deals between you and any brand. Any outreach, negotiation, or agreement you enter into with a brand is solely between you and that brand.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4">3. Informational Tools — Not Professional Advice</h2>
          <p className="text-muted-foreground leading-relaxed">
            MAVLIT includes a feature that flags common contract issues for informational purposes. MAVLIT is not a law firm and does not provide legal advice. This feature is educational only, may be incomplete or inaccurate, and is not a substitute for a licensed attorney. Always consult an attorney before signing or relying on any contract. Similarly, any rate or deal-range information shown is drawn from observed, reported data and is not a guarantee or a recommendation of what you should charge.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4">4. Brand and Contact Information</h2>
          <p className="text-muted-foreground leading-relaxed">
            Brand profiles and contact information are compiled from public and third-party sources for your convenience and may be incomplete, outdated, or inaccurate. We do not guarantee that any contact is current, that any brand will respond, or that any deal will result from your use of the platform.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4">5. Your Responsibilities</h2>
          <p className="text-muted-foreground leading-relaxed">
            You agree to use the beta only for your own legitimate creator-brand outreach, to comply with applicable law in any outreach you send, and not to scrape, redistribute, or share data obtained through MAVLIT with third parties.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4">6. Feedback</h2>
          <p className="text-muted-foreground leading-relaxed">
            As a beta participant, we ask that you provide honest feedback about your experience. We may use your feedback to improve MAVLIT without restriction or compensation beyond what may be separately agreed.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4">7. No Warranty; Limitation of Liability</h2>
          <p className="text-muted-foreground leading-relaxed">
            The beta is provided "as is," without warranties of any kind. To the maximum extent permitted by law, MAVLIT is not liable for any indirect or consequential damages arising from your use of the beta, and our total liability will not exceed $100.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4">8. Confidentiality of the Beta</h2>
          <p className="text-muted-foreground leading-relaxed">
            Because MAVLIT is not yet public, we ask that you keep the product, its features, and any non-public information you learn about it confidential, and not share screenshots, credentials, or access with anyone outside the beta without our permission.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4">9. Term and Termination</h2>
          <p className="text-muted-foreground leading-relaxed">
            These Terms apply for as long as you participate in the beta. Either party may end your participation at any time.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4">10. Governing Law</h2>
          <p className="text-muted-foreground leading-relaxed">
            These Terms are governed by the laws of the State of California, and any dispute will be resolved in the state or federal courts located in Orange County, California.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4">11. Contact</h2>
          <p className="text-muted-foreground leading-relaxed">
            Questions:{" "}
            <a href="mailto:contact@alternativenation.net" className="text-primary hover:underline">contact@alternativenation.net</a>{" "}
            — BWB Media Inc., 517 35th St. Unit B, Newport Beach, California.
          </p>
        </section>
      </div>
    </div>
  );
}
