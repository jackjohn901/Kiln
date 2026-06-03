import { useCallback, useEffect, useRef, useState, useId } from "react";
import { Link, useSearch, useLocation } from "wouter";
import {
  TrendingUp, DollarSign, Zap, MessageSquare, Star, ArrowUpRight,
  BarChart2, Loader2, Banknote, X, Pencil, Check, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight,
  CreditCard, CheckCircle, AlertCircle, Unlink, ExternalLink, RefreshCw,
  ShoppingBag, Clock, Bell, Package, Share2, MessageCircle, Download,
} from "lucide-react";

import { useWebSocket } from "@/hooks/useWebSocket";
import { useSettings } from "@/contexts/SettingsContext";
import { readPaymentSettings } from "@/utils/paymentSettings";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

type RefreshInterval = "30s" | "1m" | "5m" | "manual";
const REFRESH_MS: Record<RefreshInterval, number | null> = {
  "30s": 30_000,
  "1m":  60_000,
  "5m":  300_000,
  "manual": null,
};
const REFRESH_LABELS: Record<RefreshInterval, string> = {
  "30s": "30s",
  "1m":  "1m",
  "5m":  "5m",
  "manual": "Manual",
};
import Nav from "@/components/Nav";
import ShareModal from "@/components/ShareModal";
import { useProfile } from "@/contexts/ProfileContext";
import { useStripeConnect } from "@/contexts/StripeConnectContext";

interface EarningLine {
  id: string;
  type: "subscription" | "tip" | "commission" | "drop" | "listing";
  label: string;
  sublabel: string;
  amount: number;
  date: string;
  fromUserId?: string | null;
  fromAvatarUrl?: string | null;
  fromHandle?: string | null;
}

interface SalesByType {
  listings: number;
  drops: number;
  commissions: number;
  workshops: number;
}

interface EarningTotals {
  tips: number;
  subscriptions: number;
  shopSales: number;
  salesByType: SalesByType;
  total: number;
}

interface PayoutRecord {
  id: string;
  amountCents: number;
  status: string;
  method: string | null;
  requestedAt: string;
  processedAt: string | null;
}

interface StripeConnectStatus {
  connected: boolean;
  status: string | null;
  chargesEnabled: boolean;
  accountId?: string | null;
  disabledReason?: string | null;
  requirementsCurrentDeadline?: number | null;
  requirementsEventuallyDue?: number;
  requirementsPastDue?: number;
}

interface CurrencyBalance {
  currency: string;
  availableCents: number;
  pendingCents: number;
}

interface StripeBalance {
  balances: CurrencyBalance[];
  nextPayoutDate: number | null;
  nextPayoutCents: number | null;
  nextPayoutCurrency: string | null;
}

interface PatronTier {
  id: string;
  name: string;
  description: string | null;
  price: number;
  perks: string[];
  subscriberCount: number;
}

interface SaleOrder {
  id: string;
  buyerId: string;
  type: string;
  title: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  processingWindowDays: number | null;
  processingWindowLabel: string | null;
  manualPayout: boolean;
  buyerDisplayName: string | null;
  buyerHandle: string | null;
  buyerAvatarUrl: string | null;
}

const TYPE_CONFIG = {
  subscription: { icon: Star,          color: "text-amber-400",   bg: "bg-amber-500/15",   label: "Subscription" },
  tip:          { icon: DollarSign,    color: "text-emerald-400", bg: "bg-emerald-500/15", label: "Tip" },
  commission:   { icon: MessageSquare, color: "text-blue-400",    bg: "bg-blue-500/15",    label: "Commission" },
  drop:         { icon: Zap,           color: "text-orange-400",  bg: "bg-orange-500/15",  label: "Drop" },
  listing:      { icon: BarChart2,     color: "text-stone-400",   bg: "bg-stone-500/15",   label: "Sale" },
};

const STATUS_COLOR: Record<string, string> = {
  pending:   "text-amber-400 bg-amber-500/10 border-amber-500/20",
  approved:  "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  paid:      "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  rejected:  "text-rose-400 bg-rose-500/10 border-rose-500/20",
};

function formatPrice(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function formatStripeAmount(minorUnits: number, currency: string): string {
  const isoCode = currency.toUpperCase();
  const fractionDigits = new Intl.NumberFormat("en-US", { style: "currency", currency: isoCode })
    .resolvedOptions().minimumFractionDigits ?? 2;
  const major = minorUnits / Math.pow(10, fractionDigits);
  return major.toLocaleString("en-US", { style: "currency", currency: isoCode });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function Earnings() {
  const { profile } = useProfile();
  const { bannerDismissed, dismissBanner, resetDismissal } = useStripeConnect();
  const { settings } = useSettings();
  const search = useSearch();
  const [, navigate] = useLocation();
  const { subscribe } = useWebSocket();

  const now = new Date();

  function readPersistedMonth(): { month: number; year: number } {
    try {
      const raw = localStorage.getItem("kiln:earnings:selectedMonth");
      if (raw) {
        const parsed = JSON.parse(raw) as { month: number; year: number };
        if (
          typeof parsed.month === "number" && parsed.month >= 0 && parsed.month <= 11 &&
          typeof parsed.year  === "number" && parsed.year  >= 2000
        ) return parsed;
      }
    } catch { /* ignore */ }
    return { month: now.getMonth(), year: now.getFullYear() };
  }

  const persisted = readPersistedMonth();
  const [selectedMonth, setSelectedMonth] = useState(persisted.month);
  const [selectedYear, setSelectedYear]   = useState(persisted.year);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear]           = useState(persisted.year);

  useEffect(() => {
    try {
      localStorage.setItem(
        "kiln:earnings:selectedMonth",
        JSON.stringify({ month: selectedMonth, year: selectedYear }),
      );
    } catch { /* ignore */ }
  }, [selectedMonth, selectedYear]);
  const monthPickerRef = useRef<HTMLDivElement>(null);

  const isCurrentMonth = selectedMonth === now.getMonth() && selectedYear === now.getFullYear();

  function goToPrevMonth() {
    setSelectedMonth(m => {
      if (m === 0) { setSelectedYear(y => y - 1); return 11; }
      return m - 1;
    });
  }

  function goToNextMonth() {
    if (isCurrentMonth) return;
    setSelectedMonth(m => {
      if (m === 11) { setSelectedYear(y => y + 1); return 0; }
      return m + 1;
    });
  }

  function openMonthPicker() {
    setPickerYear(selectedYear);
    setShowMonthPicker(true);
  }

  function selectPickerMonth(month: number) {
    setSelectedMonth(month);
    setSelectedYear(pickerYear);
    setShowMonthPicker(false);
  }

  useEffect(() => {
    if (!showMonthPicker) return;
    function handleClickOutside(e: MouseEvent) {
      if (monthPickerRef.current && !monthPickerRef.current.contains(e.target as Node)) {
        setShowMonthPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMonthPicker]);

  // Delivery-estimate callout
  const [deliveryCalloutDismissed, setDeliveryCalloutDismissed] = useState(() => {
    try { return localStorage.getItem("kiln:earnings:deliveryCalloutDismissed") === "1"; } catch { return false; }
  });
  const [paymentSettingsSnap] = useState(() => readPaymentSettings());
  const missingDeliveryEstimate =
    !deliveryCalloutDismissed &&
    !paymentSettingsSnap.processingWindow &&
    !(paymentSettingsSnap.processingWindowLabel?.trim());

  function dismissDeliveryCallout() {
    try { localStorage.setItem("kiln:earnings:deliveryCalloutDismissed", "1"); } catch {}
    setDeliveryCalloutDismissed(true);
  }

  const [earnings, setEarnings]   = useState<EarningLine[]>([]);
  const [totals, setTotals]       = useState<EarningTotals>({ tips: 0, subscriptions: 0, shopSales: 0, salesByType: { listings: 0, drops: 0, commissions: 0, workshops: 0 }, total: 0 });
  const [salesBreakdownOpen, setSalesBreakdownOpen] = useState(false);
  const [loading, setLoading]     = useState(true);
  const [saleBanner, setSaleBanner] = useState<string | null>(null);
  const saleBannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showSaleShare, setShowSaleShare] = useState(false);
  const [statsFlash, setStatsFlash] = useState(false);
  const statsFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [statsLastRefreshed, setStatsLastRefreshed] = useState<Date | null>(null);
  const [, setStatsTick] = useState(0);

  // Payout state
  const [payouts, setPayouts]           = useState<PayoutRecord[]>([]);
  const [payoutLoading, setPayoutLoading] = useState(true);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("bank");
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [payoutError, setPayoutError]   = useState("");
  const [showPayouts, setShowPayouts]   = useState(false);

  // Sales state
  const [sales, setSales]               = useState<SaleOrder[]>([]);
  const [salesLoading, setSalesLoading] = useState(true);
  const [showSales, setShowSales]       = useState(false);

  // Sales filter state
  const [salesSearch, setSalesSearch]   = useState("");
  const [salesStatus, setSalesStatus]   = useState<string>("all");
  const [salesSort, setSalesSort]       = useState<"newest" | "oldest">("newest");
  const [salesDateFrom, setSalesDateFrom] = useState("");
  const [salesDateTo, setSalesDateTo]     = useState("");
  const [salesDatePreset, setSalesDatePreset] = useState<string>("");

  const applySalesPreset = useCallback((preset: "7d" | "month" | "lastMonth" | "year") => {
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const now = new Date();
    let from: Date;
    let to: Date;
    switch (preset) {
      case "7d":
        to = now;
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
        break;
      case "month":
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = now;
        break;
      case "lastMonth":
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        to = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case "year":
        from = new Date(now.getFullYear(), 0, 1);
        to = now;
        break;
    }
    setSalesDateFrom(fmt(from));
    setSalesDateTo(fmt(to));
    setSalesDatePreset(preset);
  }, []);

  const exportSalesCSV = useCallback(() => {
    const needle = salesSearch.trim().toLowerCase();
    const fromMs = salesDateFrom ? new Date(salesDateFrom).getTime() : null;
    const toMs = salesDateTo ? new Date(salesDateTo + "T23:59:59.999").getTime() : null;
    const filtered = sales
      .filter(s => {
        if (salesStatus !== "all" && s.status !== salesStatus) return false;
        const saleMs = new Date(s.createdAt).getTime();
        if (fromMs !== null && saleMs < fromMs) return false;
        if (toMs !== null && saleMs > toMs) return false;
        if (needle) {
          const titleMatch = s.title.toLowerCase().includes(needle);
          const buyerMatch = (s.buyerDisplayName ?? "").toLowerCase().includes(needle)
            || (s.buyerHandle ?? "").toLowerCase().includes(needle);
          if (!titleMatch && !buyerMatch) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const ta = new Date(a.createdAt).getTime();
        const tb = new Date(b.createdAt).getTime();
        return salesSort === "newest" ? tb - ta : ta - tb;
      });

    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const header = ["Date", "Title", "Buyer", "Status", "Amount"].join(",");
    const rows = filtered.map(s => {
      const date = new Date(s.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
      const buyer = s.buyerDisplayName?.trim() || (s.buyerHandle ? `@${s.buyerHandle}` : "Anonymous buyer");
      const amount = s.amount.toFixed(2);
      return [escape(date), escape(s.title), escape(buyer), escape(s.status), amount].join(",");
    });
    const filtersActive = !!(salesSearch.trim() || salesStatus !== "all" || salesDateFrom || salesDateTo);
    const lines = [header, ...rows];
    if (filtersActive) {
      const total = filtered.reduce((sum, s) => sum + s.amount, 0);
      const label = `Filtered total: ${filtered.length} ${filtered.length === 1 ? "sale" : "sales"}`;
      lines.push("");
      lines.push([escape(label), "", "", "", total.toFixed(2)].join(","));
    }
    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sales.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [sales, salesSearch, salesStatus, salesSort, salesDateFrom, salesDateTo]);

  const exportEarningsCSV = useCallback(() => {
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const typeLabel = (t: EarningLine["type"]) =>
      t === "tip" || t === "subscription" ? t : "sale";
    const header = ["Date", "Type", "Amount", "Label"].join(",");
    const rows = earnings.map(line => {
      const date = new Date(line.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
      return [escape(date), escape(typeLabel(line.type)), line.amount.toFixed(2), escape(line.label)].join(",");
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "earnings.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [earnings]);

  // Monthly trend sparkline state
  interface MonthSummary { month: string; label: string; total: number }
  const [monthlyTrend, setMonthlyTrend] = useState<MonthSummary[]>([]);

  // Patron tier state
  const [myTiers, setMyTiers]           = useState<PatronTier[]>([]);
  const [tiersLoading, setTiersLoading] = useState(true);
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [tierName, setTierName]         = useState("");
  const [tierPrice, setTierPrice]       = useState("");
  const [savingTier, setSavingTier]     = useState(false);
  const [showTiers, setShowTiers]       = useState(false);

  // Stripe Connect state
  const [stripeConnect, setStripeConnect] = useState<StripeConnectStatus | null>(null);
  const [connectLoading, setConnectLoading] = useState(true);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [disconnectingStripe, setDisconnectingStripe] = useState(false);
  const [connectSuccessToast, setConnectSuccessToast] = useState(false);
  const [openingDashboard, setOpeningDashboard] = useState(false);
  const [stripeBalance, setStripeBalance] = useState<StripeBalance | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceRefreshing, setBalanceRefreshing] = useState(false);
  const [balanceError, setBalanceError] = useState(false);
  const [balancePollError, setBalancePollError] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<RefreshInterval>(() => {
    const saved = localStorage.getItem("kiln_balance_refresh_interval");
    return (saved as RefreshInterval | null) ?? "1m";
  });
  const [earningsRefreshInterval, setEarningsRefreshInterval] = useState<RefreshInterval>(() => {
    const saved = localStorage.getItem("kiln_earnings_refresh_interval");
    return (saved as RefreshInterval | null) ?? "1m";
  });
  const [earningsRefreshing, setEarningsRefreshing] = useState(false);
  const autoRefreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const earningsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chargesEnabledRef = useRef(false);
  const prevTotalsRef = useRef<EarningTotals | null>(null);

  const fetchBalance = useCallback(async (isBackground = false) => {
    if (isBackground) {
      setBalanceRefreshing(true);
    } else {
      setBalanceLoading(true);
      setBalanceError(false);
    }
    setBalancePollError(false);
    try {
      const r = await fetch("/api/me/stripe/connect/balance", { credentials: "include" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const b = await r.json() as StripeBalance;
      setStripeBalance(b);
      setLastRefreshed(new Date());
    } catch (err: unknown) {
      if (isBackground) {
        setBalancePollError(true);
      } else {
        console.error("[Kiln] Stripe balance fetch failed:", err);
        setBalanceError(true);
      }
    } finally {
      setBalanceLoading(false);
      setBalanceRefreshing(false);
    }
  }, []);

  // Auto-refresh interval — persists choice to localStorage and restarts the timer
  useEffect(() => {
    localStorage.setItem("kiln_balance_refresh_interval", refreshInterval);
    if (autoRefreshTimerRef.current) clearInterval(autoRefreshTimerRef.current);
    const ms = REFRESH_MS[refreshInterval];
    if (ms !== null && chargesEnabledRef.current) {
      autoRefreshTimerRef.current = setInterval(() => { void fetchBalance(true); }, ms);
    }
    return () => {
      if (autoRefreshTimerRef.current) clearInterval(autoRefreshTimerRef.current);
    };
  }, [refreshInterval, fetchBalance]);

  // Show success toast when returning from Stripe onboarding
  useEffect(() => {
    const params = new URLSearchParams(search);
    if (params.get("connected") === "true") {
      setConnectSuccessToast(true);
      setTimeout(() => setConnectSuccessToast(false), 4000);
    }
  }, [search]);

  // Fetch Stripe Connect status and kick off initial balance load + polling
  useEffect(() => {
    fetch("/api/me/stripe/connect/status", { credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: StripeConnectStatus) => {
        setStripeConnect(data);
        if (data.chargesEnabled) {
          chargesEnabledRef.current = true;
          void fetchBalance(false);
          const ms = REFRESH_MS[refreshInterval];
          if (ms !== null) {
            if (autoRefreshTimerRef.current) clearInterval(autoRefreshTimerRef.current);
            autoRefreshTimerRef.current = setInterval(() => { void fetchBalance(true); }, ms);
          }
        }
      })
      .catch(() => {})
      .finally(() => setConnectLoading(false));

    return () => {
      if (autoRefreshTimerRef.current) clearInterval(autoRefreshTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleConnectStripe() {
    setConnectingStripe(true);
    try {
      const res = await fetch("/api/me/stripe/connect", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json() as { url: string };
      window.location.href = data.url;
    } catch {
      setConnectingStripe(false);
    }
  }

  async function handleOpenDashboard() {
    setOpeningDashboard(true);
    const newTab = window.open("", "_blank", "noopener,noreferrer");
    try {
      const res = await fetch("/api/me/stripe/connect/dashboard-link", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json() as { url: string };
      if (newTab) newTab.location.href = data.url;
    } catch {
      if (newTab) newTab.close();
    } finally {
      setOpeningDashboard(false);
    }
  }

  async function handleDisconnectStripe() {
    setDisconnectingStripe(true);
    try {
      await fetch("/api/me/stripe/connect/disconnect", {
        method: "POST",
        credentials: "include",
      });
      setStripeConnect({ connected: false, status: null, chargesEnabled: false });
    } catch { /* ignore */ }
    finally { setDisconnectingStripe(false); }
  }

  const fetchEarnings = useCallback(async (): Promise<EarningTotals | undefined> => {
    try {
      const r = await fetch(`/api/me/earnings?month=${selectedMonth + 1}&year=${selectedYear}`, { credentials: "include" });
      if (!r.ok) return undefined;
      const data = await r.json() as { earnings?: EarningLine[]; totals?: { tips?: number; subscriptions?: number; sales?: number; shopSales?: number; salesByType?: SalesByType; total?: number } };
      setEarnings(data.earnings ?? []);
      const t = data.totals ?? {};
      const newTotals: EarningTotals = {
        tips: t.tips ?? 0,
        subscriptions: t.subscriptions ?? 0,
        shopSales: t.shopSales ?? t.sales ?? 0,
        salesByType: t.salesByType ?? { listings: 0, drops: 0, commissions: 0, workshops: 0 },
        total: t.total ?? 0,
      };
      setTotals(newTotals);
      prevTotalsRef.current = newTotals;
      return newTotals;
    } catch { /* ignore */ }
    return undefined;
  }, [selectedMonth, selectedYear]);

  const fetchSales = useCallback(async () => {
    try {
      const r = await fetch("/api/me/sales", { credentials: "include" });
      if (!r.ok) return;
      const data = await r.json() as { orders?: SaleOrder[] };
      setSales(data.orders ?? []);
    } catch { /* ignore */ }
  }, []);

  const fetchStripeStatus = useCallback(async () => {
    try {
      const r = await fetch("/api/me/stripe/connect/status", { credentials: "include" });
      if (!r.ok) return;
      const data = await r.json() as StripeConnectStatus;
      setStripeConnect(data);
      if (data.chargesEnabled) {
        chargesEnabledRef.current = true;
        void fetchBalance(true);
      }
    } catch { /* ignore */ }
  }, [fetchBalance]);

  const fetchMonthlyTrend = useCallback(async () => {
    try {
      const r = await fetch(
        `/api/me/earnings/monthly-summary?months=6&year=${selectedYear}&month=${selectedMonth + 1}`,
        { credentials: "include" },
      );
      if (!r.ok) return;
      const data = await r.json() as { months?: MonthSummary[] };
      setMonthlyTrend(data.months ?? []);
    } catch { /* ignore */ }
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    fetchEarnings().finally(() => setLoading(false));
    void fetchMonthlyTrend();

    fetch("/api/payouts", { credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setPayouts((data as { payouts?: PayoutRecord[] }).payouts ?? []))
      .catch(() => {})
      .finally(() => setPayoutLoading(false));

    fetchSales().finally(() => setSalesLoading(false));
  }, [fetchEarnings, fetchSales, fetchMonthlyTrend]);

  const triggerStatsFlash = useCallback(() => {
    if (statsFlashTimerRef.current) clearTimeout(statsFlashTimerRef.current);
    setStatsFlash(true);
    setStatsLastRefreshed(new Date());
    statsFlashTimerRef.current = setTimeout(() => setStatsFlash(false), settings.earnings_flash_ms);
  }, [settings.earnings_flash_ms]);

  useEffect(() => {
    return subscribe("notification", (evt) => {
      const notifType = evt.notifType as string | undefined;
      if (notifType !== "sale" && notifType !== "tip" && notifType !== "subscription") return;
      void fetchEarnings().then(triggerStatsFlash);
      void fetchMonthlyTrend();
      void fetchSales();
      if (chargesEnabledRef.current) {
        void fetchBalance(true);
      } else if (notifType === "sale") {
        void fetchStripeStatus();
      }
      if (notifType === "sale") {
        const text = (evt.text as string | undefined) ?? "New sale!";
        const label = text.replace(/^New sale:\s*/i, "").trim() || "New sale!";
        setSaleBanner(label);
        if (saleBannerTimerRef.current) clearTimeout(saleBannerTimerRef.current);
        saleBannerTimerRef.current = setTimeout(() => setSaleBanner(null), 8000);
      }
    });
  }, [subscribe, fetchEarnings, fetchMonthlyTrend, fetchSales, fetchBalance, fetchStripeStatus, triggerStatsFlash]);

  const handleRefreshEarningsNow = useCallback(async () => {
    setEarningsRefreshing(true);
    try {
      const result = await fetchEarnings();
      if (result) triggerStatsFlash();
      void fetchSales();
      if (chargesEnabledRef.current) void fetchBalance(true);
    } finally {
      setEarningsRefreshing(false);
    }
  }, [fetchEarnings, fetchSales, fetchBalance, triggerStatsFlash]);

  useEffect(() => {
    localStorage.setItem("kiln_earnings_refresh_interval", earningsRefreshInterval);
    if (earningsTimerRef.current) clearInterval(earningsTimerRef.current);
    const ms = REFRESH_MS[earningsRefreshInterval];
    if (ms !== null) {
      earningsTimerRef.current = setInterval(async () => {
        const result = await fetchEarnings();
        if (result) triggerStatsFlash();
        void fetchSales();
        if (chargesEnabledRef.current) void fetchBalance(true);
      }, ms);
    }
    return () => {
      if (earningsTimerRef.current) clearInterval(earningsTimerRef.current);
    };
  }, [earningsRefreshInterval, fetchEarnings, fetchSales, fetchBalance, triggerStatsFlash]);

  useEffect(() => {
    if (!statsLastRefreshed) return;
    const id = setInterval(() => setStatsTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [statsLastRefreshed]);

  useEffect(() => {
    if (!profile?.id) return;
    fetch(`/api/patron-tiers/${profile.id}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setMyTiers(data.tiers ?? []))
      .catch(() => {})
      .finally(() => setTiersLoading(false));
  }, [profile?.id]);

  async function handleRequestPayout() {
    const cents = Math.round(parseFloat(payoutAmount) * 100);
    if (!cents || cents < 100) { setPayoutError("Minimum payout is $1.00"); return; }
    setRequestingPayout(true);
    setPayoutError("");
    try {
      const res = await fetch("/api/payouts/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ amountCents: cents, method: payoutMethod }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setPayoutError(d.error ?? "Request failed");
        return;
      }
      const data = await res.json() as PayoutRecord;
      setPayouts(prev => [data, ...prev]);
      setShowPayoutModal(false);
      setPayoutAmount("");
      setShowPayouts(true);
    } catch { setPayoutError("Request failed. Try again."); }
    finally { setRequestingPayout(false); }
  }

  function startEditTier(tier: PatronTier) {
    setEditingTierId(tier.id);
    setTierName(tier.name);
    setTierPrice(String(tier.price / 100));
  }

  async function handleSaveTier(tierId: string) {
    setSavingTier(true);
    try {
      const res = await fetch(`/api/patron-tiers/${tierId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: tierName,
          price: Math.round(parseFloat(tierPrice) * 100),
        }),
      });
      if (res.ok) {
        const updated = await res.json() as PatronTier;
        setMyTiers(prev => prev.map(t => t.id === tierId ? { ...t, ...updated } : t));
        setEditingTierId(null);
      }
    } catch { /* ignore */ }
    finally { setSavingTier(false); }
  }

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-6">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="font-serif text-2xl text-amber-100">Earnings</h1>
            <p className="mt-1 text-sm text-stone-500">Revenue from your creative work on Kiln.</p>
          </div>
          <button
            onClick={() => { setShowPayoutModal(true); setPayoutError(""); }}
            className="flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-500/20 transition-colors"
          >
            <Banknote size={13} /> Request Payout
          </button>
        </div>

        {/* Payment setup prompt */}
        {!connectLoading && (!stripeConnect?.connected || !stripeConnect?.chargesEnabled) && !bannerDismissed && (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <div className="flex items-start gap-3">
              <AlertCircle size={16} className="shrink-0 text-amber-400 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-300">Complete your payment setup</p>
                <p className="text-xs text-amber-400/70 mt-0.5">Connect Stripe so buyers can pay you directly. Without it, you can’t receive earnings.</p>
              </div>
              <button
                onClick={handleConnectStripe}
                disabled={connectingStripe}
                className="shrink-0 rounded-full bg-amber-500 px-3 py-1.5 text-xs font-semibold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-50"
              >
                {connectingStripe ? "Connecting…" : "Connect Stripe"}
              </button>
              <button
                onClick={dismissBanner}
                className="shrink-0 rounded-full p-1 text-amber-500/40 hover:text-amber-400 transition-colors"
              >
                <X size={13} />
              </button>
            </div>
          </div>
        )}

        {/* Delivery estimate callout */}
        {missingDeliveryEstimate && (
          <div className="mb-4 rounded-xl border border-stone-600/40 bg-stone-800/60 px-4 py-3">
            <div className="flex items-start gap-3">
              <Clock size={16} className="shrink-0 text-amber-400 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-200">Set your delivery estimate</p>
                <p className="text-xs text-stone-400 mt-0.5">Buyers see a generic default right now. Add a processing window so they know when to expect their order.</p>
              </div>
              <Link
                href="/settings?section=payments"
                className="shrink-0 rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition-colors whitespace-nowrap"
              >
                Set estimate
              </Link>
              <button
                onClick={dismissDeliveryCallout}
                className="shrink-0 rounded-full p-1 text-stone-600 hover:text-stone-400 transition-colors"
              >
                <X size={13} />
              </button>
            </div>
          </div>
        )}

        {/* New-sale notification banner */}
        {saleBanner && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <Bell size={15} className="shrink-0 text-emerald-400" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-emerald-300">New sale!</p>
              <p className="text-xs text-emerald-400/80 truncate">{saleBanner}</p>
            </div>
            <button
              onClick={() => setShowSaleShare(true)}
              className="shrink-0 flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors"
            >
              <Share2 size={11} /> Share
            </button>
            <button
              onClick={() => {
                setSaleBanner(null);
                if (saleBannerTimerRef.current) clearTimeout(saleBannerTimerRef.current);
              }}
              className="shrink-0 rounded-full p-1 hover:bg-white/5 text-emerald-500/60 hover:text-emerald-400 transition-colors"
            >
              <X size={13} />
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="animate-spin text-stone-600" />
          </div>
        ) : (
          <>
            {/* Earnings Summary Card */}
            <div className={[
              "mb-4 rounded-2xl border bg-stone-900/50 p-4 transition-all duration-300",
              statsFlash
                ? "border-emerald-400/60 shadow-[0_0_12px_2px_rgba(52,211,153,0.25)] scale-[1.02]"
                : "border-white/8",
            ].join(" ")}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs uppercase tracking-wider text-stone-500">Earnings Summary</p>
                <div className="relative flex items-center gap-1" ref={monthPickerRef}>
                  <button
                    onClick={goToPrevMonth}
                    className="flex items-center justify-center w-6 h-6 rounded-full hover:bg-white/8 text-stone-500 hover:text-stone-300 transition-colors"
                    aria-label="Previous month"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={openMonthPicker}
                    className="text-xs font-medium text-stone-300 min-w-[110px] text-center tabular-nums hover:text-amber-300 transition-colors rounded px-1 py-0.5 hover:bg-white/5"
                    aria-label="Open month picker"
                    aria-expanded={showMonthPicker}
                  >
                    {MONTH_NAMES[selectedMonth]} {selectedYear}
                  </button>
                  <button
                    onClick={goToNextMonth}
                    disabled={isCurrentMonth}
                    className="flex items-center justify-center w-6 h-6 rounded-full hover:bg-white/8 text-stone-500 hover:text-stone-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Next month"
                  >
                    <ChevronRight size={14} />
                  </button>
                  {showMonthPicker && (
                    <div className="absolute right-0 top-8 z-50 w-56 rounded-xl border border-white/10 bg-stone-900 shadow-xl p-3 animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex items-center justify-between mb-3">
                        <button
                          onClick={() => setPickerYear(y => y - 1)}
                          className="flex items-center justify-center w-6 h-6 rounded-full hover:bg-white/8 text-stone-500 hover:text-stone-300 transition-colors"
                          aria-label="Previous year"
                        >
                          <ChevronLeft size={13} />
                        </button>
                        <span className="text-xs font-semibold text-stone-200">{pickerYear}</span>
                        <button
                          onClick={() => setPickerYear(y => y + 1)}
                          disabled={pickerYear >= now.getFullYear()}
                          className="flex items-center justify-center w-6 h-6 rounded-full hover:bg-white/8 text-stone-500 hover:text-stone-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          aria-label="Next year"
                        >
                          <ChevronRight size={13} />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        {MONTH_NAMES.map((name, idx) => {
                          const isFuture = pickerYear > now.getFullYear() || (pickerYear === now.getFullYear() && idx > now.getMonth());
                          const isSelected = idx === selectedMonth && pickerYear === selectedYear;
                          return (
                            <button
                              key={name}
                              onClick={() => !isFuture && selectPickerMonth(idx)}
                              disabled={isFuture}
                              className={[
                                "rounded-lg py-1.5 text-xs font-medium transition-colors",
                                isFuture
                                  ? "text-stone-700 cursor-not-allowed"
                                  : isSelected
                                    ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40"
                                    : "text-stone-400 hover:bg-white/8 hover:text-stone-200",
                              ].join(" ")}
                            >
                              {name.slice(0, 3)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-0 divide-x divide-white/8">
                <div className="flex flex-col items-center px-4 py-1">
                  <DollarSign size={15} className="mb-2 text-pink-400" />
                  <p className="text-base font-bold text-stone-100">{formatPrice(totals.tips)}</p>
                  <p className="text-xs text-stone-500 mt-0.5">Tips</p>
                </div>
                <div className="flex flex-col items-center px-4 py-1">
                  <Star size={15} className="mb-2 text-violet-400" />
                  <p className="text-base font-bold text-stone-100">{formatPrice(totals.subscriptions)}</p>
                  <p className="text-xs text-stone-500 mt-0.5">Patrons</p>
                </div>
                <div className="flex flex-col items-center px-4 py-1">
                  <ShoppingBag size={15} className="mb-2 text-emerald-400" />
                  <p className="text-base font-bold text-stone-100">{formatPrice(totals.shopSales)}</p>
                  <p className="text-xs text-stone-500 mt-0.5">Shop</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-3">
                <p className="text-xs text-stone-500">Total earnings</p>
                <p className="text-sm font-bold text-amber-400">{formatPrice(totals.total)}</p>
              </div>
            </div>

            {/* 6-month sparkline trend */}
            {monthlyTrend.length > 0 && (() => {
              const selectedKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;
              const maxTotal = Math.max(...monthlyTrend.map(m => m.total), 1);
              const chartH = 48;
              const barW = 24;
              const gap = 8;
              const totalW = monthlyTrend.length * (barW + gap) - gap;

              return (
                <div className="mb-4 rounded-2xl border border-white/8 bg-stone-900/50 px-4 pt-3 pb-4">
                  <p className="text-xs uppercase tracking-wider text-stone-500 mb-3">6-Month Trend</p>
                  <div className="flex items-end justify-between gap-0" style={{ height: chartH + 32 }}>
                    <svg
                      width="100%"
                      height={chartH + 32}
                      viewBox={`0 0 ${totalW} ${chartH + 32}`}
                      preserveAspectRatio="xMidYMid meet"
                      style={{ overflow: "visible" }}
                    >
                      {monthlyTrend.map((m, i) => {
                        const isSelected = m.month === selectedKey;
                        const barH = maxTotal === 0 ? 2 : Math.max(2, Math.round((m.total / maxTotal) * chartH));
                        const x = i * (barW + gap);
                        const y = chartH - barH;
                        return (
                          <g key={m.month}>
                            <rect
                              x={x}
                              y={y}
                              width={barW}
                              height={barH}
                              rx={4}
                              className={isSelected ? "fill-amber-400" : "fill-stone-700"}
                              opacity={isSelected ? 1 : 0.7}
                            />
                            {isSelected && m.total > 0 && (
                              <text
                                x={x + barW / 2}
                                y={y - 4}
                                textAnchor="middle"
                                fontSize={9}
                                className="fill-amber-300"
                                style={{ fontFamily: "inherit" }}
                              >
                                {formatPrice(m.total)}
                              </text>
                            )}
                            <text
                              x={x + barW / 2}
                              y={chartH + 14}
                              textAnchor="middle"
                              fontSize={9}
                              className={isSelected ? "fill-amber-300 font-semibold" : "fill-stone-500"}
                              style={{ fontFamily: "inherit" }}
                            >
                              {m.label}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>
              );
            })()}

            {/* Stats */}
            <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total", value: formatPrice(totals.total), icon: TrendingUp, color: "text-amber-400", clickable: false },
                { label: "Shop Sales", value: formatPrice(totals.shopSales), icon: ShoppingBag, color: "text-sky-400", clickable: true },
                { label: "Tips", value: formatPrice(totals.tips), icon: DollarSign, color: "text-emerald-400", clickable: false },
                { label: "Subscriptions", value: formatPrice(totals.subscriptions), icon: Star, color: "text-purple-400", clickable: false },
              ].map(stat => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    onClick={stat.clickable ? () => setSalesBreakdownOpen(o => !o) : undefined}
                    className={[
                      "relative rounded-2xl border bg-stone-900/50 p-4 transition-all duration-300",
                      stat.clickable ? "cursor-pointer hover:border-sky-500/30 hover:bg-stone-900/70 select-none" : "",
                      statsFlash
                        ? "border-emerald-400/60 shadow-[0_0_12px_2px_rgba(52,211,153,0.25)] scale-[1.02]"
                        : "border-white/8",
                    ].join(" ")}
                  >
                    {stat.clickable && (
                      <span className="absolute top-2 right-2">
                        {salesBreakdownOpen
                          ? <ChevronUp size={12} className="text-stone-600" />
                          : <ChevronDown size={12} className="text-stone-600" />}
                      </span>
                    )}
                    <Icon size={16} className={`mb-2 ${stat.color}`} />
                    <p className="text-xs text-stone-500 mb-0.5">{stat.label}</p>
                    <p className="text-lg font-bold text-stone-100">{stat.value}</p>
                    <p className={[
                      "text-[10px] font-medium text-emerald-400 mt-1 transition-opacity duration-700",
                      statsFlash ? "opacity-100" : "opacity-0",
                    ].join(" ")}>Updated just now</p>
                  </div>
                );
              })}
            </div>

            {/* Last refreshed timestamp + interval picker + manual refresh */}
            <div className="flex items-center justify-between -mt-3 mb-4 px-1 gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-stone-600">Auto-refresh:</span>
                <div className="flex gap-0.5">
                  {(["30s", "1m", "5m", "manual"] as RefreshInterval[]).map(opt => (
                    <button
                      key={opt}
                      onClick={() => setEarningsRefreshInterval(opt)}
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                        earningsRefreshInterval === opt
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "text-stone-600 hover:text-stone-400 border border-transparent"
                      }`}
                    >
                      {REFRESH_LABELS[opt]}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => void handleRefreshEarningsNow()}
                  disabled={earningsRefreshing}
                  title="Refresh now"
                  className="flex items-center gap-1 text-[10px] text-stone-500 hover:text-stone-300 disabled:opacity-40 transition-colors ml-1"
                >
                  <RefreshCw size={10} className={earningsRefreshing ? "animate-spin" : ""} />
                  Refresh
                </button>
              </div>
              {statsLastRefreshed && (() => {
                const secs = Math.floor((Date.now() - statsLastRefreshed.getTime()) / 1000);
                const label = secs < 5 ? "just now" : secs < 60 ? `${secs}s ago` : `${Math.floor(secs / 60)}m ago`;
                return (
                  <span className="text-[10px] text-stone-600 shrink-0">
                    Updated {label}
                  </span>
                );
              })()}
            </div>

            {/* Shop Sales breakdown */}
            {salesBreakdownOpen && (
              <div className="mb-6 rounded-2xl border border-sky-500/15 bg-stone-900/40 p-4 animate-in fade-in slide-in-from-top-1 duration-200">
                <p className="text-xs uppercase tracking-wider text-stone-600 mb-3">Shop Sales by channel</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Listings", value: totals.salesByType.listings, icon: ShoppingBag, color: "text-sky-400", bg: "bg-sky-500/10" },
                    { label: "Drops", value: totals.salesByType.drops, icon: Zap, color: "text-orange-400", bg: "bg-orange-500/10" },
                    { label: "Commissions", value: totals.salesByType.commissions, icon: MessageSquare, color: "text-blue-400", bg: "bg-blue-500/10" },
                    { label: "Workshops", value: totals.salesByType.workshops, icon: BarChart2, color: "text-violet-400", bg: "bg-violet-500/10" },
                  ].map(row => {
                    const Icon = row.icon;
                    const pct = totals.shopSales > 0 ? Math.round((row.value / totals.shopSales) * 100) : 0;
                    return (
                      <div key={row.label} className="rounded-xl border border-white/5 bg-stone-900/50 p-3">
                        <div className={`inline-flex h-7 w-7 items-center justify-center rounded-lg mb-2 ${row.bg}`}>
                          <Icon size={13} className={row.color} />
                        </div>
                        <p className="text-[11px] text-stone-500 mb-0.5">{row.label}</p>
                        <p className="text-sm font-bold text-stone-100">{formatPrice(row.value)}</p>
                        {totals.shopSales > 0 && (
                          <p className="text-[10px] text-stone-600 mt-0.5">{pct}% of shop</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent transactions */}
            {earnings.length === 0 ? (
              <div className="py-16 text-center">
                <BarChart2 size={32} className="mx-auto mb-3 text-stone-700" />
                <p className="text-stone-500 text-sm">No earnings recorded yet.</p>
                <p className="text-stone-600 text-xs mt-1">Set up patron tiers or accept tips to start earning.</p>
                <div className="mt-4 flex justify-center gap-3">
                  <Link href={profile?.id ? `/artists/${profile.id}/patron` : "/discover"} className="rounded-full border border-amber-500/30 px-4 py-1.5 text-xs text-amber-400 hover:bg-amber-500/10 transition-colors">
                    Set up tiers
                  </Link>
                  <Link href="/shop" className="rounded-full border border-stone-700 px-4 py-1.5 text-xs text-stone-400 hover:border-stone-500 transition-colors">
                    List work
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-2 mb-8">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-xs uppercase tracking-wider text-stone-600">Recent Transactions</h2>
                  <button
                    onClick={exportEarningsCSV}
                    className="flex items-center gap-1 rounded-lg border border-white/8 px-2.5 py-1 text-[11px] text-stone-500 hover:text-amber-400 hover:border-amber-500/30 transition-colors"
                  >
                    <Download size={10} />
                    Export CSV
                  </button>
                </div>
                {earnings.map(line => {
                  const conf = TYPE_CONFIG[line.type] ?? TYPE_CONFIG.tip;
                  const Icon = conf.icon;
                  const isTip = line.type === "tip";
                  const tipperInitials = isTip
                    ? line.label.replace(/^Tip from\s*/i, "").trim().split(" ").filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase()
                    : "";
                  const profileHref = isTip && line.fromUserId
                    ? `/artists/${line.fromUserId}`
                    : null;

                  const rowContent = (
                    <>
                      {isTip ? (
                        <div className="h-9 w-9 flex-shrink-0 rounded-xl overflow-hidden">
                          {line.fromAvatarUrl ? (
                            <img src={line.fromAvatarUrl} alt={tipperInitials} className="h-full w-full object-cover" />
                          ) : (
                            <div className={`flex h-full w-full items-center justify-center ${conf.bg} text-xs font-bold ${conf.color}`}>
                              {tipperInitials || "?"}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${conf.bg}`}>
                          <Icon size={15} className={conf.color} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-200 leading-tight">{line.label}</p>
                        {line.sublabel && <p className="text-xs text-stone-600 mt-0.5">{line.sublabel}</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-emerald-400">+{formatPrice(line.amount)}</p>
                        <p className="text-[10px] text-stone-600">{formatDate(line.date)}</p>
                      </div>
                    </>
                  );

                  return profileHref ? (
                    <Link key={line.id} href={profileHref} className="flex items-center gap-3 rounded-xl border border-white/5 bg-stone-900/40 p-3 hover:bg-stone-900/70 hover:border-white/10 transition-colors cursor-pointer">
                      {rowContent}
                    </Link>
                  ) : (
                    <div key={line.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-stone-900/40 p-3">
                      {rowContent}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Stripe Payouts */}
            <div className="mb-6 rounded-2xl border border-white/8 bg-stone-900/40 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CreditCard size={14} className="text-indigo-400" />
                  <span className="text-sm font-medium text-stone-200">Stripe Payouts</span>
                </div>
                {bannerDismissed && (
                  <button
                    onClick={resetDismissal}
                    className="text-[11px] text-stone-500 hover:text-indigo-400 transition-colors"
                  >
                    Show account status
                  </button>
                )}
              </div>

              {connectLoading ? (
                <div className="flex justify-center py-3"><Loader2 size={16} className="animate-spin text-stone-600" /></div>
              ) : stripeConnect?.connected ? (
                <div>
                  {(() => {
                    const isRestricted = !!stripeConnect.disabledReason;
                    const deadline = stripeConnect.requirementsCurrentDeadline;
                    const nowMs = Date.now();
                    const deadlineMs = deadline != null ? deadline * 1000 : null;
                    const isOverdue = deadlineMs != null && deadlineMs < nowMs;
                    const isFutureDeadline = deadlineMs != null && deadlineMs >= nowMs;
                    const daysRemaining = isFutureDeadline
                      ? Math.ceil((deadlineMs! - nowMs) / 86400000)
                      : null;
                    const eventuallyDue = stripeConnect.requirementsEventuallyDue ?? 0;
                    const pastDue = stripeConnect.requirementsPastDue ?? 0;
                    const needsUrgentAction = isRestricted || isOverdue || pastDue > 0;
                    const needsUpcomingAction = !needsUrgentAction && (isFutureDeadline || eventuallyDue > 0);
                    const deadlineLabel = deadlineMs
                      ? new Date(deadlineMs).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                      : null;

                    return (
                      <>
                        {/* Restriction / overdue requirements — red banner */}
                        {needsUrgentAction && (
                          <div className="mb-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3">
                            <div className="flex items-start gap-2">
                              <AlertCircle size={15} className="mt-0.5 flex-shrink-0 text-rose-400" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-rose-300">
                                  {isRestricted ? "Your Stripe account is restricted" : "Verification required"}
                                </p>
                                <p className="mt-0.5 text-xs text-rose-400/80">
                                  {isRestricted
                                    ? "Payouts are paused. Complete verification to restore access."
                                    : `Action required${deadlineLabel ? ` by ${deadlineLabel}` : ""}. Complete verification to avoid interruptions.`}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={handleConnectStripe}
                              disabled={connectingStripe}
                              className="mt-2.5 flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/15 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/25 disabled:opacity-50 transition-colors"
                            >
                              {connectingStripe ? <Loader2 size={11} className="animate-spin" /> : <ExternalLink size={11} />}
                              {connectingStripe ? "Redirecting…" : "Complete verification"}
                            </button>
                          </div>
                        )}

                        {/* Upcoming requirements — yellow caution banner */}
                        {needsUpcomingAction && (
                          <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                            <div className="flex items-start gap-2">
                              <AlertCircle size={15} className="mt-0.5 flex-shrink-0 text-amber-400" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-amber-300">
                                  Action needed
                                  {daysRemaining != null && ` — ${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining`}
                                </p>
                                <p className="mt-0.5 text-xs text-amber-400/80">
                                  {eventuallyDue > 0
                                    ? `${eventuallyDue} verification item${eventuallyDue === 1 ? "" : "s"} due${deadlineLabel ? ` by ${deadlineLabel}` : ""}. Complete now to keep payouts running smoothly.`
                                    : `Verification required by ${deadlineLabel}. Complete now to keep payouts running smoothly.`}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={handleConnectStripe}
                              disabled={connectingStripe}
                              className="mt-2.5 flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/25 disabled:opacity-50 transition-colors"
                            >
                              {connectingStripe ? <Loader2 size={11} className="animate-spin" /> : <ExternalLink size={11} />}
                              {connectingStripe ? "Redirecting…" : "Complete verification"}
                            </button>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {stripeConnect.chargesEnabled ? (
                              <CheckCircle size={15} className="text-emerald-400" />
                            ) : (
                              <AlertCircle size={15} className="text-amber-400" />
                            )}
                            <div>
                              <p className="text-sm text-stone-200">
                                {stripeConnect.chargesEnabled ? "Connected & active" : "Connected — pending verification"}
                              </p>
                              {stripeConnect.status && (
                                <p className="text-[10px] text-stone-600 capitalize">{stripeConnect.status}</p>
                              )}
                            </div>
                          </div>
                          {needsUrgentAction ? (
                            <button
                              onClick={handleDisconnectStripe}
                              disabled={disconnectingStripe}
                              title="Disconnect Stripe account"
                              className="flex items-center gap-1 rounded-lg border border-white/5 px-2.5 py-1.5 text-xs text-stone-700 hover:text-stone-500 hover:border-white/8 disabled:opacity-50 transition-colors"
                            >
                              {disconnectingStripe ? <Loader2 size={11} className="animate-spin" /> : <Unlink size={11} />}
                              Disconnect
                            </button>
                          ) : (
                            <button
                              onClick={handleDisconnectStripe}
                              disabled={disconnectingStripe}
                              className="flex items-center gap-1 rounded-lg border border-white/8 px-2.5 py-1.5 text-xs text-stone-500 hover:text-rose-400 hover:border-rose-500/30 disabled:opacity-50 transition-colors"
                            >
                              {disconnectingStripe ? <Loader2 size={11} className="animate-spin" /> : <Unlink size={11} />}
                              Disconnect
                            </button>
                          )}
                        </div>
                      </>
                    );
                  })()}
                  {stripeConnect.chargesEnabled && (
                    <>
                      {balanceLoading && !stripeBalance ? (
                        <div className="mt-3 flex justify-center py-2">
                          <Loader2 size={14} className="animate-spin text-stone-600" />
                        </div>
                      ) : balanceError ? (
                        <p className="mt-3 text-xs text-stone-500">
                          Balance unavailable — open the Stripe Dashboard to view your funds.
                        </p>
                      ) : stripeBalance ? (
                        <>
                          {/* Balance header: last-refreshed timestamp + manual refresh button */}
                          <div className="mt-3 flex items-center justify-between mb-1.5">
                            <span className="text-[10px] text-stone-600">
                              {balancePollError
                                ? <span className="text-amber-500/80">Refresh failed — showing last known balance</span>
                                : balanceRefreshing
                                ? "Refreshing…"
                                : lastRefreshed
                                  ? `Updated ${lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
                                  : ""}
                            </span>
                            <button
                              onClick={() => void fetchBalance(false)}
                              disabled={balanceRefreshing || balanceLoading}
                              title="Refresh balance now"
                              className="flex items-center gap-1 text-[10px] text-stone-500 hover:text-stone-300 disabled:opacity-40 transition-colors"
                            >
                              <RefreshCw size={10} className={balanceRefreshing ? "animate-spin" : ""} />
                              Refresh
                            </button>
                          </div>
                          <div className={`space-y-2 transition-opacity duration-300 ${balanceRefreshing ? "opacity-50" : "opacity-100"}`}>
                            {/* Header row */}
                            <div className="grid grid-cols-3 gap-x-2 px-1">
                              <p className="text-[10px] text-stone-600 uppercase tracking-wide">Currency</p>
                              <p className="text-[10px] text-stone-600 uppercase tracking-wide text-right">Available</p>
                              <p className="text-[10px] text-stone-600 uppercase tracking-wide text-right">Pending</p>
                            </div>
                            {/* Per-currency rows — or empty-state */}
                            {stripeBalance.balances.length === 0 && (
                              <p className="text-xs text-stone-500 px-1">No balance yet — funds will appear here once you receive a payment.</p>
                            )}
                            {stripeBalance.balances.map(b => (
                              <div key={b.currency} className="rounded-xl border border-white/8 bg-stone-800/50 px-3 py-2 grid grid-cols-3 gap-x-2 items-center relative overflow-hidden">
                                {balanceRefreshing && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/3 to-transparent animate-[shimmer_1.5s_infinite]" />}
                                <p className="text-xs font-semibold text-stone-300 uppercase">{b.currency}</p>
                                <p className="text-sm font-bold text-emerald-400 text-right tabular-nums">
                                  {formatStripeAmount(b.availableCents, b.currency)}
                                </p>
                                <p className="text-sm font-bold text-amber-400 text-right tabular-nums">
                                  {formatStripeAmount(b.pendingCents, b.currency)}
                                </p>
                              </div>
                            ))}
                            {/* Next payout row */}
                            {stripeBalance.nextPayoutDate !== null && (
                              <div className="rounded-xl border border-white/8 bg-stone-800/50 px-3 py-2 flex items-center justify-between">
                                <p className="text-[10px] text-stone-500">Next payout</p>
                                <p className="text-xs font-medium text-stone-300">
                                  {new Date(stripeBalance.nextPayoutDate * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                  {stripeBalance.nextPayoutCents !== null && (
                                    <span className="ml-1.5 text-emerald-400">
                                      {formatStripeAmount(stripeBalance.nextPayoutCents, stripeBalance.nextPayoutCurrency ?? "usd")}
                                    </span>
                                  )}
                                </p>
                              </div>
                            )}
                          </div>
                          {/* Auto-refresh interval picker */}
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-[10px] text-stone-600 shrink-0">Auto-refresh:</span>
                            <div className="flex gap-1">
                              {(["30s", "1m", "5m", "manual"] as RefreshInterval[]).map(opt => (
                                <button
                                  key={opt}
                                  onClick={() => setRefreshInterval(opt)}
                                  className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                                    refreshInterval === opt
                                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                      : "text-stone-600 hover:text-stone-400 border border-transparent"
                                  }`}
                                >
                                  {REFRESH_LABELS[opt]}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : null}
                      <button
                        onClick={handleOpenDashboard}
                        disabled={openingDashboard}
                        className="mt-3 flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-400 hover:bg-indigo-500/20 disabled:opacity-50 transition-colors"
                      >
                        {openingDashboard ? <Loader2 size={11} className="animate-spin" /> : <ExternalLink size={11} />}
                        Open Stripe Dashboard
                      </button>
                    </>
                  )}
                  <p className="mt-2 text-[10px] text-stone-600">Buyers pay directly to your Stripe account. Kiln retains a 10% platform fee.</p>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-stone-500 mb-3">Connect a Stripe account to receive payouts directly when buyers purchase your work.</p>
                  <button
                    onClick={handleConnectStripe}
                    disabled={connectingStripe}
                    className="flex items-center gap-2 rounded-full bg-indigo-500/15 border border-indigo-500/30 px-4 py-2 text-sm font-medium text-indigo-400 hover:bg-indigo-500/25 disabled:opacity-50 transition-colors"
                  >
                    {connectingStripe ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                    {connectingStripe ? "Redirecting…" : "Connect with Stripe"}
                  </button>
                </div>
              )}
            </div>

            {/* Patron tiers — quick edit */}
            <div className="mb-6 rounded-2xl border border-white/8 bg-stone-900/40">
              <button
                onClick={() => setShowTiers(v => !v)}
                className="flex w-full items-center justify-between p-4"
              >
                <div className="flex items-center gap-2">
                  <Star size={14} className="text-amber-400" />
                  <span className="text-sm font-medium text-stone-200">Patron Tiers</span>
                  {myTiers.length > 0 && (
                    <span className="rounded-full bg-stone-800 px-2 py-0.5 text-[10px] text-stone-500">{myTiers.length}</span>
                  )}
                </div>
                {showTiers ? <ChevronUp size={14} className="text-stone-600" /> : <ChevronDown size={14} className="text-stone-600" />}
              </button>

              {showTiers && (
                <div className="border-t border-white/5 p-4 space-y-3">
                  {tiersLoading ? (
                    <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-stone-600" /></div>
                  ) : myTiers.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-xs text-stone-600">No tiers yet.</p>
                      <Link href={profile?.id ? `/artists/${profile.id}/patron` : "/discover"} className="mt-2 inline-block text-xs text-amber-400 hover:text-amber-300">
                        Create your first tier →
                      </Link>
                    </div>
                  ) : (
                    myTiers.map(tier => (
                      <div key={tier.id} className="rounded-xl border border-white/5 bg-stone-900/60 p-3">
                        {editingTierId === tier.id ? (
                          <div className="space-y-2">
                            <input
                              value={tierName}
                              onChange={e => setTierName(e.target.value)}
                              placeholder="Tier name"
                              className="w-full rounded-lg border border-white/10 bg-stone-800 px-3 py-1.5 text-sm text-stone-200 focus:border-amber-500/50 focus:outline-none"
                            />
                            <div className="flex items-center gap-2">
                              <span className="text-stone-500 text-sm">$</span>
                              <input
                                type="number"
                                value={tierPrice}
                                onChange={e => setTierPrice(e.target.value)}
                                placeholder="Price / month"
                                className="flex-1 rounded-lg border border-white/10 bg-stone-800 px-3 py-1.5 text-sm text-stone-200 focus:border-amber-500/50 focus:outline-none"
                              />
                              <span className="text-xs text-stone-600">/ mo</span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSaveTier(tier.id)}
                                disabled={savingTier}
                                className="flex items-center gap-1 rounded-lg bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-500/30 disabled:opacity-50 transition-colors"
                              >
                                {savingTier ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Save
                              </button>
                              <button
                                onClick={() => setEditingTierId(null)}
                                className="flex items-center gap-1 rounded-lg border border-white/8 px-3 py-1.5 text-xs text-stone-500 hover:text-stone-300 transition-colors"
                              >
                                <X size={11} /> Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-stone-200">{tier.name}</p>
                              <p className="text-xs text-stone-500">${(tier.price / 100).toFixed(0)}/mo · {tier.subscriberCount} patron{tier.subscriberCount !== 1 ? "s" : ""}</p>
                            </div>
                            <button
                              onClick={() => startEditTier(tier)}
                              className="flex items-center gap-1 rounded-lg border border-white/8 px-2.5 py-1.5 text-xs text-stone-500 hover:text-amber-400 hover:border-amber-500/30 transition-colors"
                            >
                              <Pencil size={11} /> Edit
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Payout history */}
            <div className="mb-6 rounded-2xl border border-white/8 bg-stone-900/40">
              <button
                onClick={() => setShowPayouts(v => !v)}
                className="flex w-full items-center justify-between p-4"
              >
                <div className="flex items-center gap-2">
                  <Banknote size={14} className="text-stone-400" />
                  <span className="text-sm font-medium text-stone-200">Payout History</span>
                  {payouts.length > 0 && (
                    <span className="rounded-full bg-stone-800 px-2 py-0.5 text-[10px] text-stone-500">{payouts.length}</span>
                  )}
                </div>
                {showPayouts ? <ChevronUp size={14} className="text-stone-600" /> : <ChevronDown size={14} className="text-stone-600" />}
              </button>

              {showPayouts && (
                <div className="border-t border-white/5 p-4 space-y-2">
                  {payoutLoading ? (
                    <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-stone-600" /></div>
                  ) : payouts.length === 0 ? (
                    <p className="text-xs text-stone-600 text-center py-4">No payout requests yet.</p>
                  ) : (
                    payouts.map(p => (
                      <div key={p.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-stone-900/60 p-3">
                        <div>
                          <p className="text-sm font-medium text-stone-200">{formatPrice(p.amountCents / 100)}</p>
                          <p className="text-[10px] text-stone-600">{formatDate(p.requestedAt)} · {p.method ?? "bank"}</p>
                        </div>
                        <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${STATUS_COLOR[p.status] ?? "text-stone-400 bg-stone-800 border-white/8"}`}>
                          {p.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Sales history */}
            <div className="mb-6 rounded-2xl border border-white/8 bg-stone-900/40">
              <div className="flex w-full items-center justify-between px-4 py-3">
                <button
                  onClick={() => {
                    setShowSales(v => {
                      if (v) {
                        setSalesSearch("");
                        setSalesStatus("all");
                        setSalesSort("newest");
                        setSalesDateFrom("");
                        setSalesDateTo("");
                      }
                      return !v;
                    });
                  }}
                  className="flex flex-1 items-center gap-2 text-left"
                >
                  <ShoppingBag size={14} className="text-stone-400" />
                  <span className="text-sm font-medium text-stone-200">Sales</span>
                  {sales.length > 0 && (
                    <span className="rounded-full bg-stone-800 px-2 py-0.5 text-[10px] text-stone-500">{sales.length}</span>
                  )}
                </button>
                <div className="flex items-center gap-2">
                  {sales.length > 0 && (
                    <button
                      onClick={exportSalesCSV}
                      className="flex items-center gap-1 rounded-lg border border-white/8 px-2.5 py-1 text-[11px] text-stone-500 hover:text-amber-400 hover:border-amber-500/30 transition-colors"
                    >
                      <Download size={10} />
                      Export CSV
                    </button>
                  )}
                  <Link
                    href="/settings?section=payments"
                    className="flex items-center gap-1 rounded-lg border border-white/8 px-2.5 py-1 text-[11px] text-stone-500 hover:text-amber-400 hover:border-amber-500/30 transition-colors"
                  >
                    <Clock size={10} />
                    Edit processing window
                  </Link>
                  <button
                    onClick={() => {
                      setShowSales(v => {
                        if (v) {
                          setSalesSearch("");
                          setSalesStatus("all");
                          setSalesSort("newest");
                          setSalesDateFrom("");
                          setSalesDateTo("");
                        }
                        return !v;
                      });
                    }}
                    className="text-stone-600 hover:text-stone-400 transition-colors"
                  >
                    {showSales ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>

              {showSales && (
                <div className="border-t border-white/5 p-4 space-y-3">
                  {/* Filter bar */}
                  {!salesLoading && sales.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        value={salesSearch}
                        onChange={e => setSalesSearch(e.target.value)}
                        placeholder="Search by title or buyer…"
                        className="w-full rounded-lg border border-white/10 bg-stone-800/60 px-3 py-1.5 text-xs text-stone-200 placeholder-stone-600 focus:border-amber-500/40 focus:outline-none"
                      />
                      <div className="flex items-center gap-2 flex-wrap">
                        <select
                          value={salesStatus}
                          onChange={e => setSalesStatus(e.target.value)}
                          className="flex-1 min-w-0 rounded-lg border border-white/10 bg-stone-800/60 px-2.5 py-1.5 text-xs text-stone-300 focus:border-amber-500/40 focus:outline-none"
                        >
                          <option value="all">All statuses</option>
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="in_progress">In progress</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                        </select>
                        <select
                          value={salesSort}
                          onChange={e => setSalesSort(e.target.value as "newest" | "oldest")}
                          className="flex-1 min-w-0 rounded-lg border border-white/10 bg-stone-800/60 px-2.5 py-1.5 text-xs text-stone-300 focus:border-amber-500/40 focus:outline-none"
                        >
                          <option value="newest">Newest first</option>
                          <option value="oldest">Oldest first</option>
                        </select>
                        {(salesSearch || salesStatus !== "all" || salesDateFrom || salesDateTo) && (
                          <button
                            onClick={() => { setSalesSearch(""); setSalesStatus("all"); setSalesSort("newest"); setSalesDateFrom(""); setSalesDateTo(""); setSalesDatePreset(""); }}
                            className="flex items-center gap-1 rounded-lg border border-white/8 px-2 py-1.5 text-[11px] text-stone-500 hover:text-stone-300 transition-colors"
                          >
                            <X size={10} /> Reset
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {([
                          { key: "7d", label: "Last 7 days" },
                          { key: "month", label: "This month" },
                          { key: "lastMonth", label: "Last month" },
                          { key: "year", label: "This year" },
                        ] as const).map(p => (
                          <button
                            key={p.key}
                            onClick={() => applySalesPreset(p.key)}
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                              salesDatePreset === p.key
                                ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                                : "border-white/10 bg-stone-800/60 text-stone-400 hover:text-stone-200 hover:border-white/20"
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] text-stone-500 shrink-0">From</label>
                        <input
                          type="date"
                          value={salesDateFrom}
                          onChange={e => { setSalesDateFrom(e.target.value); setSalesDatePreset(""); }}
                          className="flex-1 min-w-0 rounded-lg border border-white/10 bg-stone-800/60 px-2.5 py-1.5 text-xs text-stone-300 focus:border-amber-500/40 focus:outline-none [color-scheme:dark]"
                        />
                        <label className="text-[11px] text-stone-500 shrink-0">To</label>
                        <input
                          type="date"
                          value={salesDateTo}
                          onChange={e => { setSalesDateTo(e.target.value); setSalesDatePreset(""); }}
                          className="flex-1 min-w-0 rounded-lg border border-white/10 bg-stone-800/60 px-2.5 py-1.5 text-xs text-stone-300 focus:border-amber-500/40 focus:outline-none [color-scheme:dark]"
                        />
                      </div>
                    </div>
                  )}
                  {/* Sales list */}
                  <div className="space-y-2">
                  {salesLoading ? (
                    <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-stone-600" /></div>
                  ) : sales.length === 0 ? (
                    <p className="text-xs text-stone-600 text-center py-4">No sales yet.</p>
                  ) : (() => {
                    const needle = salesSearch.trim().toLowerCase();
                    const fromMs = salesDateFrom ? new Date(salesDateFrom).getTime() : null;
                    const toMs = salesDateTo ? new Date(salesDateTo + "T23:59:59.999").getTime() : null;
                    const filtered = sales
                      .filter(s => {
                        if (salesStatus !== "all" && s.status !== salesStatus) return false;
                        const saleMs = new Date(s.createdAt).getTime();
                        if (fromMs !== null && saleMs < fromMs) return false;
                        if (toMs !== null && saleMs > toMs) return false;
                        if (needle) {
                          const titleMatch = s.title.toLowerCase().includes(needle);
                          const buyerMatch = (s.buyerDisplayName ?? "").toLowerCase().includes(needle)
                            || (s.buyerHandle ?? "").toLowerCase().includes(needle);
                          if (!titleMatch && !buyerMatch) return false;
                        }
                        return true;
                      })
                      .sort((a, b) => {
                        const ta = new Date(a.createdAt).getTime();
                        const tb = new Date(b.createdAt).getTime();
                        return salesSort === "newest" ? tb - ta : ta - tb;
                      });
                    const filtersActive = !!(salesSearch || salesStatus !== "all" || salesDateFrom || salesDateTo);
                    const summary = filtersActive ? (() => {
                      const byCurrency: Record<string, number> = {};
                      for (const s of filtered) {
                        const key = (s.currency ?? "usd").toUpperCase();
                        byCurrency[key] = (byCurrency[key] ?? 0) + s.amount;
                      }
                      const totalsStr = Object.entries(byCurrency)
                        .map(([cur, amt]) =>
                          amt.toLocaleString("en-US", { style: "currency", currency: cur, maximumFractionDigits: 2 })
                        )
                        .join(" + ");
                      const label = filtered.length === 1 ? "1 sale" : `${filtered.length} sales`;
                      return totalsStr ? `${label} · ${totalsStr} total` : `${label}`;
                    })() : null;
                    if (filtered.length === 0) {
                      return (
                        <>
                          {summary && (
                            <p className="text-[11px] text-stone-500 px-1">{summary}</p>
                          )}
                          <p className="text-xs text-stone-600 text-center py-4">No sales match your filters.</p>
                        </>
                      );
                    }
                    return (
                      <>
                        {summary && (
                          <p className="text-[11px] text-stone-500 px-1">{summary}</p>
                        )}
                        {filtered.map(sale => {
                      const hasWindow = sale.processingWindowDays !== null || sale.processingWindowLabel !== null;
                      const deliveryEstimateText = sale.processingWindowLabel?.trim()
                        ? sale.processingWindowLabel
                        : sale.processingWindowDays !== null
                          ? sale.processingWindowDays === 1
                            ? "1 business day"
                            : `${sale.processingWindowDays} business days`
                          : null;
                      const windowText = deliveryEstimateText ? `Ships within ${deliveryEstimateText}` : null;
                      const buyerLabel = sale.buyerDisplayName?.trim()
                        ? sale.buyerDisplayName
                        : sale.buyerHandle
                          ? `@${sale.buyerHandle}`
                          : "Anonymous buyer";
                      const buyerInitial = (sale.buyerDisplayName?.trim() || sale.buyerHandle || "?")[0].toUpperCase();
                      const buyerHref = sale.buyerHandle
                        ? `/artists/${sale.buyerHandle}`
                        : sale.buyerId
                          ? `/artists/${sale.buyerId}`
                          : null;
                      const orderTypeLabel = sale.manualPayout ? "Manual" : "Connect";
                      return (
                        <div
                          key={sale.id}
                          role="link"
                          tabIndex={0}
                          onClick={() => navigate(`/sales/${sale.id}`)}
                          onKeyDown={e => e.key === "Enter" && navigate(`/sales/${sale.id}`)}
                          className="block rounded-xl border border-white/5 bg-stone-900/60 p-3 hover:border-amber-500/20 hover:bg-stone-900/80 transition-colors group cursor-pointer"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <Package size={11} className="text-stone-500 flex-shrink-0" />
                                <p className="text-sm font-medium text-stone-200 leading-tight truncate group-hover:text-amber-200 transition-colors">{sale.title}</p>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {buyerHref ? (
                                  <Link
                                    href={buyerHref}
                                    onClick={e => e.stopPropagation()}
                                    className="flex items-center gap-1.5 min-w-0 hover:opacity-80 transition-opacity"
                                  >
                                    {sale.buyerAvatarUrl ? (
                                      <img
                                        src={sale.buyerAvatarUrl}
                                        alt={buyerLabel}
                                        className="h-5 w-5 flex-shrink-0 rounded-full object-cover ring-1 ring-white/10"
                                      />
                                    ) : (
                                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-stone-700 text-[9px] font-semibold text-stone-300 ring-1 ring-white/10">
                                        {buyerInitial}
                                      </span>
                                    )}
                                    <span className="text-[11px] text-amber-400/80 truncate hover:text-amber-300 transition-colors">{buyerLabel}</span>
                                  </Link>
                                ) : (
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-stone-700 text-[9px] font-semibold text-stone-300 ring-1 ring-white/10">
                                      {buyerInitial}
                                    </span>
                                    <span className="text-[11px] text-stone-500 truncate">{buyerLabel}</span>
                                  </div>
                                )}
                                <span className="text-stone-700 flex-shrink-0">·</span>
                                <p className="text-[10px] text-stone-600 flex-shrink-0">{formatDate(sale.createdAt)}</p>
                                {sale.buyerId && (
                                  <button
                                    title="Message buyer"
                                    onClick={e => { e.stopPropagation(); const ref = "KLN-" + sale.id.slice(0, 8).toUpperCase(); navigate(`/messages/${sale.buyerId}?prefill=${encodeURIComponent(`Hi! Following up on your order ${ref} — `)}`); }}
                                    className="ml-1 flex items-center justify-center rounded-full p-0.5 text-stone-600 hover:text-amber-400 hover:bg-amber-500/10 transition-colors flex-shrink-0"
                                  >
                                    <MessageCircle size={13} />
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0 space-y-1">
                              <p className="text-sm font-bold text-emerald-400">+{formatPrice(sale.amount)}</p>
                              <div className="flex items-center gap-1 justify-end">
                                <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${STATUS_COLOR[sale.status] ?? "text-stone-500 bg-stone-800/50 border-white/8"}`}>
                                  {sale.status}
                                </span>
                                <span className="rounded-full border border-white/8 bg-stone-800/50 px-1.5 py-0.5 text-[10px] text-stone-500">
                                  {orderTypeLabel}
                                </span>
                              </div>
                            </div>
                          </div>
                          {hasWindow && (
                            <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 bg-amber-500/8 border border-amber-500/15">
                              <Clock size={11} className="text-amber-400/70 flex-shrink-0" />
                              <span className="text-[11px] text-amber-300/80 font-medium">{windowText}</span>
                            </div>
                          )}
                        </div>
                      );
                        })}
                      </>
                    );
                  })()}
                  </div>
                </div>
              )}
            </div>

            {/* Expand your revenue */}
            <div className="rounded-2xl border border-white/8 bg-stone-900/40 p-4">
              <p className="text-xs text-stone-500 mb-3">Expand your revenue</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { href: profile?.id ? `/artists/${profile.id}/patron` : "/discover", icon: Star, color: "text-amber-400", label: "Patron tiers" },
                  { href: "/drops",   icon: Zap,          color: "text-amber-400", label: "Drops" },
                  { href: "/commission-tracker", icon: MessageSquare, color: "text-blue-400", label: "Commissions" },
                  { href: "/shop",    icon: BarChart2,     color: "text-stone-400", label: "Shop listings" },
                ].map(item => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.href} href={item.href} className="flex items-center gap-2 rounded-xl border border-white/8 bg-stone-900/60 p-3 hover:border-amber-500/30 transition-colors">
                      <Icon size={14} className={item.color} />
                      <span className="text-xs text-stone-300">{item.label}</span>
                      <ArrowUpRight size={10} className="ml-auto text-stone-600" />
                    </Link>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Stripe Connect success toast */}
      {connectSuccessToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg">
          <CheckCircle size={15} />
          Stripe account connected successfully!
        </div>
      )}

      {/* Payout request modal */}
      {showPayoutModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={e => e.target === e.currentTarget && setShowPayoutModal(false)}
        >
          <div className="w-full max-w-sm rounded-3xl bg-stone-900 border border-white/10 p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-serif text-lg text-amber-100">Request Payout</h2>
              <button onClick={() => setShowPayoutModal(false)} className="rounded-full p-1.5 hover:bg-white/5 text-stone-500">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-stone-500">Amount (USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">$</span>
                  <input
                    type="number"
                    value={payoutAmount}
                    onChange={e => setPayoutAmount(e.target.value)}
                    placeholder="0.00"
                    min="1"
                    step="0.01"
                    className="w-full rounded-xl border border-white/10 bg-stone-800 py-3 pl-7 pr-4 text-stone-100 focus:border-amber-500/50 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-stone-500">Method</label>
                <select
                  value={payoutMethod}
                  onChange={e => setPayoutMethod(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-stone-800 px-3 py-3 text-sm text-stone-200 focus:border-amber-500/50 focus:outline-none"
                >
                  <option value="bank">Bank transfer</option>
                  <option value="paypal">PayPal</option>
                  <option value="check">Check</option>
                </select>
              </div>

              {payoutError && <p className="text-xs text-rose-400">{payoutError}</p>}

              <p className="text-[11px] text-stone-600">Payout requests are reviewed and processed within 3–5 business days.</p>

              <button
                onClick={handleRequestPayout}
                disabled={requestingPayout || !payoutAmount}
                className="w-full flex items-center justify-center gap-2 rounded-full bg-amber-500 py-3 text-sm font-semibold text-stone-950 hover:bg-amber-400 disabled:opacity-50 transition-colors"
              >
                {requestingPayout ? <Loader2 size={15} className="animate-spin" /> : <Banknote size={15} />}
                {requestingPayout ? "Submitting…" : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ShareModal
        open={showSaleShare}
        onClose={() => setShowSaleShare(false)}
        mode="sale"
        artistName={profile?.name ?? ""}
        medium={profile?.mediums?.[0]}
        location={profile?.location ?? undefined}
        profileUrl={`https://kilndrop.com/kiln/`}
        saleItem={saleBanner ?? undefined}
      />
    </div>
  );
}
