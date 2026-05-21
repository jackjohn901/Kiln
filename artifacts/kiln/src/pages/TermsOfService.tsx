import Nav from "@/components/Nav";
import { useMeta } from "@/hooks/useMeta";
import { Link } from "wouter";

export default function TermsOfService() {
  useMeta({ title: "Terms of Service — Kiln", description: "Read the Kiln Terms of Service." });
  const updated = "May 21, 2026";
  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 pb-24">
      <Nav />
      <div className="mx-auto max-w-2xl px-5 pt-8">
        <h1 className="text-2xl font-bold text-stone-100 mb-1">Terms of Service</h1>
        <p className="text-sm text-stone-500 mb-8">Last updated {updated}</p>

        <Section title="1. Acceptance">
          <p>By creating an account or using Kiln ("the Platform"), you agree to these Terms. If you do not agree, do not use the Platform.</p>
        </Section>

        <Section title="2. Eligibility">
          <p>You must be at least 13 years old to use Kiln. If you are under 18, you confirm you have parental or guardian consent. By using the Platform you represent that all information you submit is accurate.</p>
        </Section>

        <Section title="3. Accounts">
          <ul>
            <li>You are responsible for all activity on your account.</li>
            <li>Do not share your credentials or impersonate another person.</li>
            <li>We may suspend or terminate accounts that violate these Terms.</li>
          </ul>
        </Section>

        <Section title="4. Content You Post">
          <p>You retain ownership of content you post to Kiln. By posting, you grant Kiln a non-exclusive, worldwide, royalty-free licence to display, distribute, and promote your content within the Platform. You confirm that you own or have rights to everything you post and that it does not infringe any third-party rights.</p>
          <p className="mt-2">You must not post content that is:</p>
          <ul>
            <li>Illegal, harmful, or fraudulent</li>
            <li>Harassing, threatening, or abusive toward others</li>
            <li>Spam or deceptive commercial content</li>
            <li>Infringing of copyright, trademark, or other intellectual property</li>
          </ul>
        </Section>

        <Section title="5. Marketplace Transactions">
          <p>Kiln facilitates sales between buyers and sellers. Sellers are responsible for accurate listing descriptions, pricing, fulfilment, and compliance with applicable laws including tax obligations. Kiln is not a party to any transaction between users.</p>
          <p className="mt-2">Payments are processed by Stripe. By transacting on Kiln you also agree to <a href="https://stripe.com/legal" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">Stripe's Terms of Service</a>.</p>
          <p className="mt-2">All sales are final unless the seller explicitly offers returns. Disputes must first be resolved between buyer and seller. Kiln may mediate at its discretion but is not obligated to do so.</p>
        </Section>

        <Section title="6. Patron Subscriptions">
          <p>Patron subscriptions are billed monthly. Patrons may cancel at any time; access continues until the end of the current billing period. No prorated refunds are issued for partial months. Kiln takes a platform fee on subscription revenue as disclosed in the Earnings section of the app.</p>
        </Section>

        <Section title="7. Workshops & Commissions">
          <p>Workshop bookings and commission agreements are contracts between the artist and the buyer. Kiln provides the infrastructure but is not responsible for delivery, quality, or disputes arising from these engagements.</p>
        </Section>

        <Section title="8. Prohibited Conduct">
          <ul>
            <li>Do not circumvent or disable any security feature of the Platform.</li>
            <li>Do not scrape, crawl, or bulk-extract data without written permission.</li>
            <li>Do not attempt to gain unauthorised access to any account or system.</li>
            <li>Do not use the Platform to send unsolicited commercial messages.</li>
            <li>Do not reverse-engineer or create derivative works of the Platform.</li>
          </ul>
        </Section>

        <Section title="9. Intellectual Property">
          <p>The Kiln name, logo, and all Platform software are owned by or licensed to Kiln and may not be used without prior written consent.</p>
        </Section>

        <Section title="10. Disclaimers">
          <p>The Platform is provided "as is" without warranty of any kind. We do not guarantee that the Platform will be uninterrupted, error-free, or free of harmful components. To the fullest extent permitted by law, Kiln disclaims all warranties, express or implied.</p>
        </Section>

        <Section title="11. Limitation of Liability">
          <p>To the maximum extent permitted by applicable law, Kiln's total liability to you for any claim arising from your use of the Platform shall not exceed the greater of (a) the amount you paid to Kiln in the twelve months preceding the claim or (b) $100 USD.</p>
        </Section>

        <Section title="12. Changes to These Terms">
          <p>We may update these Terms from time to time. If changes are material we will notify you via email or an in-app notice at least 14 days before they take effect. Continued use of the Platform after the effective date constitutes acceptance.</p>
        </Section>

        <Section title="13. Governing Law">
          <p>These Terms are governed by the laws of the State of Delaware, USA, without regard to conflict-of-law principles.</p>
        </Section>

        <Section title="14. Contact">
          <p>Questions about these Terms? Email <a href="mailto:support@kilnfire.app" className="text-amber-400 hover:underline">support@kilnfire.app</a> or visit our <Link href="/help" className="text-amber-400 hover:underline">Help centre</Link>.</p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-base font-semibold text-stone-100 mb-2">{title}</h2>
      <div className="text-sm text-stone-400 leading-relaxed space-y-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
        {children}
      </div>
    </section>
  );
}
