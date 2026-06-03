/**
 * Server-side authoritative registry of digital download products.
 * This is the single source of truth for product prices and free/paid status.
 * Must stay in sync with the PRODUCTS array in artifacts/kiln/src/pages/DigitalDownloads.tsx.
 * Never trust client-supplied prices for these products.
 */

export interface DigitalProductRecord {
  id: string;
  title: string;
  priceUsd: number;
  isFree: boolean;
  downloadUrl: string;
}

export const DIGITAL_PRODUCTS: DigitalProductRecord[] = [
  {
    id: "dp-001",
    title: "The Reduction Firing Handbook",
    priceUsd: 18,
    isFree: false,
    downloadUrl: "https://kilndrop.com/kiln/downloads/dp-001",
  },
  {
    id: "dp-002",
    title: "30 Production Pottery Templates",
    priceUsd: 24,
    isFree: false,
    downloadUrl: "https://kilndrop.com/kiln/downloads/dp-002",
  },
  {
    id: "dp-003",
    title: "Iron Red Glaze — 5 Tested Recipes",
    priceUsd: 8,
    isFree: false,
    downloadUrl: "https://kilndrop.com/kiln/downloads/dp-003",
  },
  {
    id: "dp-004",
    title: "Studio Glass Photography — Complete Workflow",
    priceUsd: 32,
    isFree: false,
    downloadUrl: "https://kilndrop.com/kiln/downloads/dp-004",
  },
  {
    id: "dp-005",
    title: "Raku Firing Safety & Setup Guide",
    priceUsd: 0,
    isFree: true,
    downloadUrl: "https://kilndrop.com/kiln/downloads/dp-005",
  },
  {
    id: "dp-006",
    title: "Pricing Your Craft: A Working Artist's Spreadsheet",
    priceUsd: 15,
    isFree: false,
    downloadUrl: "https://kilndrop.com/kiln/downloads/dp-006",
  },
  {
    id: "dp-007",
    title: "Shino Glaze Variations — Historical & Contemporary",
    priceUsd: 22,
    isFree: false,
    downloadUrl: "https://kilndrop.com/kiln/downloads/dp-007",
  },
  {
    id: "dp-008",
    title: "Artist Statement Masterclass — 8 Frameworks",
    priceUsd: 12,
    isFree: false,
    downloadUrl: "https://kilndrop.com/kiln/downloads/dp-008",
  },
];

const productMap = new Map<string, DigitalProductRecord>(
  DIGITAL_PRODUCTS.map((p) => [p.id, p])
);

export function getDigitalProduct(id: string): DigitalProductRecord | undefined {
  return productMap.get(id);
}
