import { useState } from "react";
import { ChevronDown, ChevronUp, Mail, MessageCircle } from "lucide-react";
import Nav from "@/components/Nav";
import { useMeta } from "@/hooks/useMeta";
import { Link } from "wouter";

interface FAQItem {
  q: string;
  a: string | React.ReactNode;
}

const SECTIONS: { title: string; items: FAQItem[] }[] = [
  {
    title: "Getting started",
    items: [
      { q: "How do I create an account?", a: "Tap the person icon in the top-right corner and sign in with your Replit account. Your profile is created automatically on first sign-in." },
      { q: "How do I set up an artist profile?", a: "After signing in, tap 'Start your artist profile' from the home feed, or go to Profile → Edit Profile. Add your medium, location, bio, and a profile photo." },
      { q: "Is Kiln free?", a: "Yes. Browsing, following, posting, and messaging are free. Kiln charges a small platform fee on marketplace sales and patron subscriptions — this is shown before you list anything." },
    ],
  },
  {
    title: "Posting & content",
    items: [
      { q: "What can I post?", a: "Short videos and photos of your craft process, finished work, studio life, and behind-the-scenes content. Supported formats: MP4, MOV, JPG, PNG, WebP." },
      { q: "How do collab posts work?", a: "When creating a post, tap 'Add collaborator' and search for the other artist's handle. Both profiles will be credited on the post." },
      { q: "Can I schedule posts?", a: "Yes. When creating a post, tap the clock icon to pick a future publish time. Scheduled posts appear in Drafts." },
    ],
  },
  {
    title: "Selling & buying",
    items: [
      { q: "How do I list a piece for sale?", a: "Go to Profile → Create Listing. Add photos, a title, description, price, and dimensions. Listings go live immediately after submission." },
      { q: "How do I get paid?", a: "Connect your Stripe account in Earnings → Connect Stripe. Funds are deposited to your bank account automatically after each sale." },
      { q: "Can I offer payment plans?", a: "Yes. On listings priced $150 or more, you can enable installment plans. Buyers will see monthly payment options at checkout." },
      { q: "How do I buy something?", a: "From the Shop or any listing, tap 'Buy Now' or add to cart. Checkout accepts all major cards via Stripe." },
      { q: "What is a Drop?", a: "A Drop is a limited-edition timed release. Artists set a quantity and a window; items sell on a first-come, first-served basis. Patrons get early access." },
    ],
  },
  {
    title: "Patron subscriptions",
    items: [
      { q: "What is a patron subscription?", a: "A monthly subscription to support an artist you love. Artists set their own tiers and perks — early access to drops, process content, studio updates." },
      { q: "How do I cancel?", a: "Go to Profile → Subscriptions. Tap the subscription and select Cancel. Access continues until the end of the current billing period." },
    ],
  },
  {
    title: "Workshops",
    items: [
      { q: "How do I book a workshop?", a: "Browse Workshops, find a class, and tap Book. Payment is processed through Stripe. You'll receive a confirmation email with details." },
      { q: "How do I create a workshop as an artist?", a: "Go to Profile → Create Workshop. Set your title, date, location (in-person or online), price, and available spots." },
    ],
  },
  {
    title: "Guilds",
    items: [
      { q: "What is a Guild?", a: "A craft community organised by technique. Join the Ceramics Guild, Glass & Fire Guild, or any other to connect with fellow makers, share work, and ask questions." },
      { q: "How do I join a guild?", a: "Go to the Guilds page and tap Join on any guild. Membership is free and instant." },
    ],
  },
  {
    title: "Account & privacy",
    items: [
      { q: "How do I delete my account?", a: "Go to Settings → Account → Delete Account. All your data, posts, and listings will be permanently removed within 30 days." },
      { q: "Can I block someone?", a: "Yes. On any profile, tap the three-dot menu and select Block. Blocked users cannot view your profile or contact you." },
      { q: "Where is the privacy policy?", a: <span>Read our <Link href="/privacy" className="text-amber-400 hover:underline">Privacy Policy</Link> for full details on data collection and usage.</span> },
    ],
  },
];

function FAQRow({ item }: { item: FAQItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-stone-800 last:border-0">
      <button
        className="flex w-full items-center justify-between gap-4 py-3.5 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-sm font-medium text-stone-200">{item.q}</span>
        {open ? <ChevronUp size={14} className="text-stone-500 shrink-0" /> : <ChevronDown size={14} className="text-stone-500 shrink-0" />}
      </button>
      {open && (
        <p className="pb-4 text-sm text-stone-400 leading-relaxed">{item.a}</p>
      )}
    </div>
  );
}

export default function Help() {
  useMeta({ title: "Help Centre — Kiln", description: "Answers to common questions about Kiln." });
  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 pb-24">
      <Nav />
      <div className="mx-auto max-w-2xl px-5 pt-8">
        <h1 className="text-2xl font-bold text-stone-100 mb-1">Help Centre</h1>
        <p className="text-sm text-stone-500 mb-8">Answers to common questions about Kiln.</p>

        <div className="space-y-8">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-amber-400 mb-3">
                {section.title}
              </h2>
              <div className="rounded-xl border border-stone-800 bg-stone-900/50 px-4">
                {section.items.map((item) => (
                  <FAQRow key={item.q} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-xl border border-stone-700 bg-stone-900/60 px-5 py-5">
          <h2 className="text-sm font-semibold text-stone-100 mb-1">Still need help?</h2>
          <p className="text-sm text-stone-400 mb-4">We typically respond within one business day.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="mailto:support@kilnfire.app"
              className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-stone-950 hover:bg-amber-400 transition-colors"
            >
              <Mail size={14} />
              Email support
            </a>
            <Link
              href="/messages"
              className="flex items-center gap-2 rounded-lg border border-stone-700 bg-stone-800 px-4 py-2.5 text-sm font-semibold text-stone-200 hover:bg-stone-700 transition-colors"
            >
              <MessageCircle size={14} />
              Message us
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
