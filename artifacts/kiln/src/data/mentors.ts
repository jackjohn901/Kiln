export interface MentorProfile {
  id: string;
  artistId: string;
  name: string;
  avatarUrl: string;
  medium: string;
  location: string;
  yearsExperience: number;
  bio: string;
  mentorshipAreas: string[];
  format: ("video-call" | "studio-visit" | "async-feedback" | "email")[];
  availability: "open" | "waitlisted" | "closed";
  spotsAvailable: number;
  totalMentored: number;
  fee: string;
  commitment: string;
  requiresPortfolio: boolean;
  testimonials: { mentee: string; text: string }[];
  tags: string[];
}

export const MENTORS: MentorProfile[] = [
  {
    id: "m-lino",
    artistId: "lino-tagliapietra",
    name: "Lino Tagliapietra",
    avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=lino",
    medium: "Glass Blowing",
    location: "Seattle, WA",
    yearsExperience: 60,
    bio: "Born in Murano, I have been working in glass for over 60 years. I offer mentorship to serious glass artists who are ready to work — not just watch. I'm interested in artists with a strong point of view, whatever their technical level.",
    mentorshipAreas: ["Hot glass technique", "Color development", "Murrine and filigrana", "Sculptural form", "Exhibition strategy"],
    format: ["video-call", "studio-visit"],
    availability: "waitlisted",
    spotsAvailable: 0,
    totalMentored: 42,
    fee: "Studio visit: $800/day. Video call: $200/hour.",
    commitment: "Minimum 3 sessions over 6 months.",
    requiresPortfolio: true,
    testimonials: [
      { mentee: "Dante Marioni", text: "Working with Lino changed how I see glass. He has a way of asking one question that rewrites everything you thought you understood." },
      { mentee: "Caleb Siemon", text: "The most demanding and most generous teacher I've ever had. Nothing is wasted in his teaching." },
    ],
    tags: ["glass-blowing", "murano", "master", "color", "sculpture"],
  },
  {
    id: "m-dante",
    artistId: "dante-marioni",
    name: "Dante Marioni",
    avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=dante",
    medium: "Glass Blowing",
    location: "Seattle, WA",
    yearsExperience: 35,
    bio: "I mentor intermediate to advanced glass artists who are serious about developing their voice. I'm particularly interested in artists working on vessel forms and those exploring Italian technique in a contemporary context.",
    mentorshipAreas: ["Vessel form", "Italian technique", "Critical feedback", "Career strategy", "Gallery relationships"],
    format: ["video-call", "async-feedback"],
    availability: "open",
    spotsAvailable: 2,
    totalMentored: 28,
    fee: "$150/hour video call. Portfolio review: $300.",
    commitment: "Flexible — minimum 2 calls.",
    requiresPortfolio: true,
    testimonials: [
      { mentee: "John Kiley", text: "Dante gave me feedback that I'd been avoiding hearing for years. My work improved more in 6 months than it had in 6 years." },
    ],
    tags: ["glass-blowing", "vessels", "italian-technique", "seattle"],
  },
  {
    id: "m-maya",
    artistId: "maya-chen",
    name: "Maya Chen",
    avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=maya-chen",
    medium: "Ceramics",
    location: "Portland, OR",
    yearsExperience: 15,
    bio: "I work in wood-fire and raku ceramics. My mentorship focuses on the conceptual and technical development of emerging ceramic artists. I'm especially interested in mentoring artists from underrepresented backgrounds in the craft world.",
    mentorshipAreas: ["Raku and atmospheric firing", "Glaze chemistry", "Hand building", "Developing a body of work", "Photographing and marketing ceramics"],
    format: ["video-call", "async-feedback", "email"],
    availability: "open",
    spotsAvailable: 4,
    totalMentored: 15,
    fee: "Sliding scale $50–150/hour. No one turned away for financial reasons.",
    commitment: "6-month minimum, bi-weekly check-ins.",
    requiresPortfolio: false,
    testimonials: [
      { mentee: "New Student", text: "Maya is the mentor I didn't know I needed. She's warm, direct, and genuinely invested in your growth." },
    ],
    tags: ["ceramics", "raku", "wood-fire", "glaze", "emerging-artists"],
  },
  {
    id: "m-james",
    artistId: "james-okafor",
    name: "James Okafor",
    avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=james",
    medium: "Blacksmithing & Bladesmithing",
    location: "Detroit, MI",
    yearsExperience: 20,
    bio: "Self-taught blacksmith and bladesmith. I specialize in traditional forging, knife-making, and decorative metalwork. I believe in learning by doing — every mentorship session involves real forge time.",
    mentorshipAreas: ["Forge setup and safety", "Knife-making fundamentals", "Heat treatment", "Traditional blacksmithing", "Running a smithy business"],
    format: ["studio-visit", "video-call"],
    availability: "open",
    spotsAvailable: 3,
    totalMentored: 11,
    fee: "Studio day (8 hours): $400. Includes materials for one knife blank.",
    commitment: "Minimum 2 studio days recommended.",
    requiresPortfolio: false,
    testimonials: [
      { mentee: "Marcus Williams", text: "Learned more in one day with James than in a year of YouTube tutorials. He explains the 'why' behind everything." },
    ],
    tags: ["blacksmithing", "bladesmithing", "knife-making", "heat-treatment", "forge"],
  },
  {
    id: "m-ingrid",
    artistId: "ingrid-larsson",
    name: "Ingrid Larsson",
    avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=ingrid",
    medium: "Natural Dyeing & Fiber Arts",
    location: "Stockholm, Sweden (remote-friendly)",
    yearsExperience: 22,
    bio: "I've spent two decades working with natural dyes, traditional Scandinavian textile techniques, and contemporary fiber art. I offer mentorship in natural dyeing, loom weaving, and developing a sustainable textile practice.",
    mentorshipAreas: ["Natural dye vat preparation", "Mordanting and color development", "Loom weaving setup", "Surface design on fabric", "Sustainable sourcing"],
    format: ["video-call", "async-feedback", "email"],
    availability: "open",
    spotsAvailable: 5,
    totalMentored: 34,
    fee: "€120/hour (sliding scale available). Free initial 30-minute conversation.",
    commitment: "Flexible — single session to ongoing.",
    requiresPortfolio: false,
    testimonials: [
      { mentee: "Freya Lindqvist", text: "Ingrid's knowledge of natural dyes is encyclopedic. She can troubleshoot any vat problem and does it with patient enthusiasm." },
      { mentee: "Sonja Berg", text: "My indigo vat has been running for 3 months thanks to Ingrid's guidance. Completely changed my practice." },
    ],
    tags: ["natural-dyeing", "fiber-arts", "weaving", "sustainable", "scandinavian"],
  },
  {
    id: "m-amara",
    artistId: "amara-diallo",
    name: "Amara Diallo",
    avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=amara",
    medium: "Studio Jewelry & Enamel",
    location: "Paris, France (remote-friendly)",
    yearsExperience: 18,
    bio: "Jewelry maker and enamellist working in Paris. My mentorship covers traditional enamel techniques, stone setting, fabrication, and developing a distinctive voice in contemporary jewelry.",
    mentorshipAreas: ["Cloisonné and champlevé enamel", "Fine silver fabrication", "Stone setting basics", "Contemporary jewelry concept development", "Gallery and market strategy"],
    format: ["video-call", "async-feedback"],
    availability: "open",
    spotsAvailable: 2,
    totalMentored: 19,
    fee: "€150/hour for technical sessions. Portfolio review: €200.",
    commitment: "Minimum 3 sessions.",
    requiresPortfolio: true,
    testimonials: [
      { mentee: "Inês Costa", text: "Amara elevated my enamel work in ways I couldn't have achieved alone. Her eye for composition is extraordinary." },
    ],
    tags: ["jewelry", "enamel", "cloisonne", "fabrication", "contemporary"],
  },
];

export function getMentorById(id: string): MentorProfile | undefined {
  return MENTORS.find((m) => m.id === id);
}
