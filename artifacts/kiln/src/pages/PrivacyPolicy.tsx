import { useEffect } from "react";

const LAST_UPDATED = "May 18, 2026";
const CONTACT_EMAIL = "privacy@kilnfire.app";
const APP_NAME = "KilnFire";
const COMPANY = "KilnFire";

export default function PrivacyPolicy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-16 pb-32">

        <h1 className="text-4xl font-bold mb-2">{APP_NAME} Privacy Policy</h1>
        <p className="text-muted-foreground text-sm mb-12">Last updated: {LAST_UPDATED}</p>

        <Section title="1. Introduction">
          <p>
            Welcome to {APP_NAME}. We are a creator platform built for craft artists — potters,
            weavers, glassworkers, metalworkers, and makers of all kinds. This Privacy Policy
            explains what information we collect, how we use it, and the choices you have.
          </p>
          <p className="mt-3">
            By using {APP_NAME} (the "Service"), you agree to the collection and use of information
            in accordance with this policy. If you do not agree, please do not use the Service.
          </p>
        </Section>

        <Section title="2. Information We Collect">
          <Subsection title="Account Information">
            When you create an account, we collect your name, email address, username, and
            profile information (bio, craft medium, location, and profile photo) that you
            choose to provide.
          </Subsection>

          <Subsection title="Content You Create">
            We store the posts, videos, photos, captions, comments, and messages you create
            and share on the platform. This includes any media files you upload.
          </Subsection>

          <Subsection title="Commerce Data">
            If you buy or sell on {APP_NAME}, we collect order details, shipping addresses,
            and transaction records. Payment card data is processed directly by Stripe and
            is never stored on our servers.
          </Subsection>

          <Subsection title="Usage Information">
            We automatically collect information about how you use the Service — pages visited,
            features used, search queries, device type, operating system, browser, and
            IP address.
          </Subsection>

          <Subsection title="Device and Push Notifications">
            If you enable push notifications on our mobile app, we collect your device's
            push notification token to deliver alerts about activity on your account (likes,
            comments, follows, sales). You can disable notifications at any time in your
            device settings.
          </Subsection>

          <Subsection title="Camera and Photos">
            Our mobile app requests access to your camera and photo library solely to let
            you capture and share your craft. We do not access your camera or photos at
            any other time.
          </Subsection>
        </Section>

        <Section title="3. How We Use Your Information">
          <ul className="list-disc pl-5 space-y-2 text-foreground/80">
            <li>To operate and improve the {APP_NAME} platform</li>
            <li>To display your profile and content to other users</li>
            <li>To process payments and fulfil orders</li>
            <li>To send you notifications about activity on your account</li>
            <li>To send service-related emails (receipts, security alerts, policy updates)</li>
            <li>To personalise your feed and discovery recommendations</li>
            <li>To detect and prevent fraud, abuse, and violations of our Terms of Service</li>
            <li>To comply with legal obligations</li>
          </ul>
          <p className="mt-4">
            We do not sell your personal information to third parties, and we do not use
            your content to train AI models without your explicit consent.
          </p>
        </Section>

        <Section title="4. Sharing Your Information">
          <Subsection title="With Other Users">
            Your profile, posts, and public activity are visible to other {APP_NAME} users
            as you configure them. Direct messages are visible only to you and the recipient.
          </Subsection>

          <Subsection title="With Service Providers">
            We share data with trusted third-party providers that help us operate the Service,
            including:
          </Subsection>
          <ul className="list-disc pl-5 mt-2 mb-4 space-y-1 text-foreground/80">
            <li><strong>Stripe</strong> — payment processing</li>
            <li><strong>Mux</strong> — video hosting and delivery</li>
            <li><strong>Resend / email provider</strong> — transactional email</li>
            <li><strong>Cloud infrastructure</strong> — hosting and storage</li>
            <li><strong>Expo / Apple / Google</strong> — mobile push notifications</li>
          </ul>
          <p>
            These providers are contractually required to protect your information and
            may only use it to provide services on our behalf.
          </p>

          <Subsection title="Legal Requirements">
            We may disclose your information if required by law, court order, or government
            authority, or to protect the rights, property, or safety of {APP_NAME}, our
            users, or the public.
          </Subsection>

          <Subsection title="Business Transfers">
            If {COMPANY} is involved in a merger, acquisition, or sale of assets, your
            information may be transferred as part of that transaction. We will notify you
            before your data is transferred and becomes subject to a different privacy policy.
          </Subsection>
        </Section>

        <Section title="5. Data Retention">
          <p>
            We retain your account information and content for as long as your account is
            active. If you delete your account, we will delete or anonymise your personal
            information within 30 days, except where we are required to retain it for legal
            or legitimate business purposes (such as transaction records).
          </p>
          <p className="mt-3">
            Content you have posted publicly may remain visible in cached or archived
            copies for a short period after deletion while those caches refresh.
          </p>
        </Section>

        <Section title="6. Your Rights and Choices">
          <ul className="list-disc pl-5 space-y-2 text-foreground/80">
            <li>
              <strong>Access and correction</strong> — You can view and update your profile
              information at any time in your account settings.
            </li>
            <li>
              <strong>Delete your account</strong> — You can delete your account from your
              profile settings page. This will remove your personal information from our
              active systems.
            </li>
            <li>
              <strong>Push notifications</strong> — You can opt out of push notifications
              in your device's notification settings.
            </li>
            <li>
              <strong>Marketing emails</strong> — You can unsubscribe from promotional
              emails using the link at the bottom of any marketing email.
            </li>
            <li>
              <strong>Data portability</strong> — You can request a copy of your data by
              emailing us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline">{CONTACT_EMAIL}</a>.
            </li>
            <li>
              <strong>California residents (CCPA)</strong> — You have the right to know
              what personal information we collect, to request deletion, and to opt out of
              sale (we do not sell personal information).
            </li>
            <li>
              <strong>EEA / UK residents (GDPR)</strong> — You have the right to access,
              rectify, erase, restrict, or object to the processing of your personal data,
              and to data portability.
            </li>
          </ul>
          <p className="mt-4">
            To exercise any of these rights, contact us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline">{CONTACT_EMAIL}</a>.
          </p>
        </Section>

        <Section title="7. Cookies and Tracking">
          <p>
            We use session cookies to keep you logged in and to protect your account. We
            do not use third-party advertising cookies or cross-site tracking technologies.
          </p>
        </Section>

        <Section title="8. Children's Privacy">
          <p>
            {APP_NAME} is not intended for children under 13 years of age (or under 16 in
            the EEA). We do not knowingly collect personal information from children. If you
            believe a child has provided us with personal information, please contact us
            immediately and we will delete it.
          </p>
        </Section>

        <Section title="9. Security">
          <p>
            We use industry-standard security measures including HTTPS encryption, secure
            session management, and access controls to protect your information. However,
            no method of transmission over the internet is 100% secure, and we cannot
            guarantee absolute security.
          </p>
        </Section>

        <Section title="10. Third-Party Links">
          <p>
            The Service may contain links to third-party websites and services. We are not
            responsible for the privacy practices of those third parties and encourage you
            to review their privacy policies.
          </p>
        </Section>

        <Section title="11. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. We will notify you of
            significant changes by posting a notice in the app or sending you an email.
            Your continued use of the Service after changes take effect constitutes your
            acceptance of the updated policy.
          </p>
        </Section>

        <Section title="12. Contact Us">
          <p>
            If you have any questions, concerns, or requests regarding this Privacy Policy
            or your personal data, please contact us:
          </p>
          <div className="mt-4 p-4 rounded-lg bg-card border border-border">
            <p className="font-semibold text-foreground">{COMPANY}</p>
            <p className="text-muted-foreground mt-1">
              Email:{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline">
                {CONTACT_EMAIL}
              </a>
            </p>
            <p className="text-muted-foreground mt-1">Website: kilndrop.com</p>
          </div>
        </Section>

      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-semibold mb-4 text-foreground">{title}</h2>
      <div className="text-foreground/80 leading-relaxed">{children}</div>
    </section>
  );
}

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      <p>{children}</p>
    </div>
  );
}
