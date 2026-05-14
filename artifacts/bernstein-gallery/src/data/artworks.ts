export interface Artwork {
  id: string;
  title: string;
  year: number;
  medium: string;
  dimensions: string;
  price: number;
  image: string;
  description: string;
  series: string;
}

export const artworks: Artwork[] = [
  {
    id: "orange-bloom",
    title: "Solar Bloom",
    year: 2024,
    medium: "Cast Glass",
    dimensions: '14" × 14" × 6"',
    price: 7800,
    image: "/artwork/orange-glass-bg.png",
    description:
      "A radiant burst of amber and copper tones, this sculptural form captures the warmth of a setting sun frozen in glass. The density and optical play within the cast body reward extended looking.",
    series: "Color Series",
  },
  {
    id: "green-cascade",
    title: "Emerald Cascade",
    year: 2024,
    medium: "Cast Glass",
    dimensions: '12" × 10" × 5"',
    price: 5200,
    image: "/artwork/green-glass-bg.png",
    description:
      "Deep viridian layers build an internal landscape of refracted light. The form reads differently in morning and evening light, revealing new depths as angles shift.",
    series: "Color Series",
  },
  {
    id: "triangle-prism",
    title: "Prism Triangle",
    year: 2025,
    medium: "Optical Cast Glass",
    dimensions: '10" × 10" × 4"',
    price: 6400,
    image: "/artwork/triangle-optical-bg.png",
    description:
      "A study in geometry and internal reflection. The triangulated form creates a precise optical architecture — each facet bending light in deliberate, calculated ways.",
    series: "Optical Series",
  },
  {
    id: "round-optical",
    title: "Optical Sphere",
    year: 2025,
    medium: "Optical Cast Glass",
    dimensions: '9" × 9" × 9"',
    price: 5800,
    image: "/artwork/round-optical-bg.png",
    description:
      "A pure sphere of optical glass, dense and luminous. The internal patterns shift with viewing angle, creating a meditative object that changes with every glance.",
    series: "Optical Series",
  },
];

export const formatPrice = (price: number): string =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(price);
