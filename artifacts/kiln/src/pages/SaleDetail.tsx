import { useState, useEffect } from "react";
import { Link, useLocation, useParams } from "wouter";
import {
  ShoppingBag, Zap, MessageSquare, BookOpen, Package, CheckCircle2,
  Clock, Truck, AlertCircle, Loader2, ChevronLeft, MapPin, FileText,
  DollarSign, Send, Printer, Download,
} from "lucide-react";
import Nav from "@/components/Nav";
import { useSocial } from "@/contexts/SocialContext";

interface Sale {
  id: string;
  buyerId: string;
  type: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  amount: number;
  currency: string;
  status: string;
  shippingAddress: string | null;
  trackingNumber: string | null;
  carrier: string | null;
  notes: string | null;
  processingWindowDays: number | null;
  processingWindowLabel: string | null;
  manualPayout: boolean;
  createdAt: string;
  updatedAt: string;
  buyerDisplayName: string | null;
  buyerHandle: string | null;
  buyerAvatarUrl: string | null;
}

const CARRIERS = [
  { value: "", label: "Unknown carrier" },
  { value: "usps",  label: "USPS" },
  { value: "ups",   label: "UPS" },
  { value: "fedex", label: "FedEx" },
  { value: "dhl",   label: "DHL" },
];

const TYPE_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  drop:       { icon: Zap,           label: "Drop",       color: "text-amber-400 bg-amber-500/10" },
  listing:    { icon: ShoppingBag,   label: "Shop",       color: "text-blue-400 bg-blue-500/10" },
  commission: { icon: MessageSquare, label: "Commission", color: "text-purple-400 bg-purple-500/10" },
  workshop:   { icon: BookOpen,      label: "Workshop",   color: "text-emerald-400 bg-emerald-500/10" },
  inquiry:    { icon: MessageSquare, label: "Inquiry",    color: "text-stone-400 bg-stone-500/10" },
};

const STATUS_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string; bg: string }> = {
  pending:     { icon: Clock,        label: "Pending",      color: "text-stone-300",   bg: "bg-stone-500/15 border-stone-500/20" },
  inquiry:     { icon: Clock,        label: "Inquiry sent", color: "text-stone-300",   bg: "bg-stone-500/15 border-stone-500/20" },
  in_progress: { icon: Package,      label: "In Progress",  color: "text-amber-300",   bg: "bg-amber-500/15 border-amber-500/20" },
  shipped:     { icon: Truck,        label: "Shipped",      color: "text-blue-300",    bg: "bg-blue-500/15 border-blue-500/20" },
  delivered:   { icon: CheckCircle2, label: "Delivered",    color: "text-emerald-300", bg: "bg-emerald-500/15 border-emerald-500/20" },
  waitlisted:  { icon: AlertCircle,  label: "Waitlisted",   color: "text-amber-300",   bg: "bg-amber-500/15 border-amber-500/20" },
  confirmed:   { icon: CheckCircle2, label: "Confirmed",    color: "text-emerald-300", bg: "bg-emerald-500/15 border-emerald-500/20" },
  cancelled:   { icon: AlertCircle,  label: "Cancelled",    color: "text-rose-300",    bg: "bg-rose-500/15 border-rose-500/20" },
};

function formatPrice(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function ordinalId(id: string) {
  return "KLN-" + id.slice(0, 8).toUpperCase();
}

async function patchSale(id: string, body: { status?: string; trackingNumber?: string; carrier?: string }) {
  const res = await fetch(`/api/me/sales/${encodeURIComponent(id)}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? "Failed to update sale");
  }
  return (await res.json()) as { sale: Sale };
}

export default function SaleDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { markLinkRead } = useSocial();
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [trackingInput, setTrackingInput] = useState("");
  const [carrierInput, setCarrierInput] = useState("");
  const [showTrackingInput, setShowTrackingInput] = useState(false);

  useEffect(() => {
    if (id) markLinkRead(`/sales/${id}`);
  }, [id, markLinkRead]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/me/sales/${encodeURIComponent(id)}`, { credentials: "include" })
      .then(r => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.ok ? r.json() : null;
      })
      .then(data => {
        if (!data?.sale) return;
        setSale(data.sale as Sale);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  async function handleStatusUpdate(newStatus: string, trackingNumber?: string, carrier?: string) {
    if (!sale) return;
    setUpdateError(null);
    setUpdating(true);
    const prevSale = sale;
    setSale(s => s ? { ...s, status: newStatus, trackingNumber: trackingNumber ?? s.trackingNumber, carrier: carrier ?? s.carrier } : s);
    try {
      const body: { status: string; trackingNumber?: string; carrier?: string } = { status: newStatus };
      if (trackingNumber !== undefined) body.trackingNumber = trackingNumber;
      if (carrier !== undefined) body.carrier = carrier;
      const { sale: updated } = await patchSale(sale.id, body);
      setSale(updated);
      setShowTrackingInput(false);
      setTrackingInput("");
      setCarrierInput("");
    } catch (err) {
      setSale(prevSale);
      setUpdateError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setUpdating(false);
    }
  }

  async function handleTrackingUpdate() {
    if (!sale) return;
    setUpdateError(null);
    setUpdating(true);
    const prevSale = sale;
    const newTracking = trackingInput.trim();
    const newCarrier = carrierInput;
    setSale(s => s ? { ...s, trackingNumber: newTracking || null, carrier: newCarrier || null } : s);
    try {
      const { sale: updated } = await patchSale(sale.id, { trackingNumber: newTracking, carrier: newCarrier });
      setSale(updated);
      setShowTrackingInput(false);
      setTrackingInput("");
      setCarrierInput("");
    } catch (err) {
      setSale(prevSale);
      setUpdateError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setUpdating(false);
    }
  }

  function handlePrintPackingSlip() {
    if (!sale) return;

    function esc(text: string | null | undefined): string {
      if (text == null) return "";
      return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    const refNum = esc(ordinalId(sale.id));
    const dateStr = esc(formatDate(sale.createdAt));
    const statusLabel = esc(STATUS_CONFIG[sale.status]?.label ?? sale.status);
    const typeLabel = esc(TYPE_CONFIG[sale.type]?.label ?? sale.type);

    const buyerName = sale.buyerDisplayName?.trim() || (sale.buyerHandle ? `@${sale.buyerHandle}` : null);
    const buyerSection = (buyerName || sale.shippingAddress) ? `
      <div style="margin-top:24px;">
        <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a7e74;margin:0 0 6px;">Ship to</p>
        ${buyerName ? `<p style="font-size:13px;font-weight:600;color:#2c2621;margin:0 0 2px;">${esc(buyerName)}</p>` : ""}
        ${sale.shippingAddress ? `<p style="font-size:12px;color:#8a7e74;white-space:pre-line;margin:0;">${esc(sale.shippingAddress)}</p>` : ""}
      </div>
    ` : "";

    const processingWindowSection = windowText ? `
      <div style="margin-top:16px;">
        <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a7e74;margin:0 0 6px;">Processing time</p>
        <p style="font-size:13px;color:#2c2621;margin:0;">${esc(windowText)}</p>
      </div>
    ` : "";

    const trackingSection = sale.trackingNumber ? `
      <div style="margin-top:16px;">
        <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a7e74;margin:0 0 6px;">Tracking</p>
        <p style="font-size:13px;color:#2c2621;margin:0;font-family:monospace;">${esc(sale.trackingNumber)}</p>
      </div>
    ` : "";

    const notesSection = sale.notes && !sale.notes.startsWith("stripe:") ? `
      <div style="margin-top:16px;">
        <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a7e74;margin:0 0 6px;">Notes</p>
        <p style="font-size:13px;color:#2c2621;margin:0;">${esc(sale.notes)}</p>
      </div>
    ` : "";

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Packing Slip ${refNum}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #fff; color: #2c2621; padding: 48px; max-width: 600px; margin: 0 auto; }
    @media print { body { padding: 24px; } }
  </style>
</head>
<body>
  <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #2c2621;padding-bottom:20px;margin-bottom:28px;">
    <div>
      <p style="font-size:22px;font-weight:700;letter-spacing:-.01em;">Kiln</p>
      <p style="font-size:11px;color:#8a7e74;margin-top:2px;">kilnfire.replit.app</p>
    </div>
    <div style="text-align:right;">
      <p style="font-size:18px;font-weight:700;font-family:monospace;">${refNum}</p>
      <p style="font-size:11px;color:#8a7e74;margin-top:2px;">Packing Slip</p>
    </div>
  </div>

  <div style="display:flex;justify-content:space-between;margin-bottom:28px;gap:24px;">
    <div>
      <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a7e74;margin-bottom:4px;">Date</p>
      <p style="font-size:13px;">${dateStr}</p>
    </div>
    <div>
      <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a7e74;margin-bottom:4px;">Status</p>
      <p style="font-size:13px;">${statusLabel}</p>
    </div>
    <div style="text-align:right;">
      <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a7e74;margin-bottom:4px;">Order type</p>
      <p style="font-size:13px;">${typeLabel}</p>
    </div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
    <thead>
      <tr>
        <th style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a7e74;padding-bottom:8px;border-bottom:1px solid #e7e3dc;text-align:left;">Item</th>
        <th style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a7e74;padding-bottom:8px;border-bottom:1px solid #e7e3dc;text-align:right;">Price</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #e7e3dc;font-size:13px;color:#2c2621;">${esc(sale.title)}${sale.description ? `<br><span style="font-size:11px;color:#8a7e74;">${esc(sale.description)}</span>` : ""}</td>
        <td style="padding:10px 0;border-bottom:1px solid #e7e3dc;text-align:right;font-size:13px;font-weight:600;color:#2c2621;white-space:nowrap;">${formatPrice(sale.amount)}</td>
      </tr>
    </tbody>
  </table>

  <div style="display:flex;justify-content:flex-end;padding-top:12px;border-top:2px solid #2c2621;margin-top:4px;">
    <div style="text-align:right;">
      <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a7e74;margin-bottom:4px;">Total</p>
      <p style="font-size:20px;font-weight:700;">${formatPrice(sale.amount)}</p>
    </div>
  </div>

  ${buyerSection}${processingWindowSection}${trackingSection}${notesSection}

  <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e7e3dc;text-align:center;">
    <p style="font-size:11px;color:#8a7e74;">Kiln — kilnfire.replit.app &nbsp;·&nbsp; Thank you for creating.</p>
  </div>
</body>
</html>`;

    const win = window.open("", "_blank", "width=700,height=900");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.document.title = `PackingSlip_${refNum}`;
    win.focus();
    win.print();
  }

  function handleDownloadPackingSlipPDF() {
    if (!sale) return;

    function esc(text: string | null | undefined): string {
      if (text == null) return "";
      return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    const refNum = esc(ordinalId(sale.id));
    const dateStr = esc(formatDate(sale.createdAt));
    const statusLabel = esc(STATUS_CONFIG[sale.status]?.label ?? sale.status);
    const typeLabel = esc(TYPE_CONFIG[sale.type]?.label ?? sale.type);

    const buyerName = sale.buyerDisplayName?.trim() || (sale.buyerHandle ? `@${sale.buyerHandle}` : null);
    const buyerSection = (buyerName || sale.shippingAddress) ? `
      <div style="margin-top:24px;">
        <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a7e74;margin:0 0 6px;">Ship to</p>
        ${buyerName ? `<p style="font-size:13px;font-weight:600;color:#2c2621;margin:0 0 2px;">${esc(buyerName)}</p>` : ""}
        ${sale.shippingAddress ? `<p style="font-size:12px;color:#8a7e74;white-space:pre-line;margin:0;">${esc(sale.shippingAddress)}</p>` : ""}
      </div>
    ` : "";

    const processingWindowSection = windowText ? `
      <div style="margin-top:16px;">
        <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a7e74;margin:0 0 6px;">Processing time</p>
        <p style="font-size:13px;color:#2c2621;margin:0;">${esc(windowText)}</p>
      </div>
    ` : "";

    const trackingSection = sale.trackingNumber ? `
      <div style="margin-top:16px;">
        <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a7e74;margin:0 0 6px;">Tracking</p>
        <p style="font-size:13px;color:#2c2621;margin:0;font-family:monospace;">${esc(sale.trackingNumber)}</p>
      </div>
    ` : "";

    const notesSection = sale.notes && !sale.notes.startsWith("stripe:") ? `
      <div style="margin-top:16px;">
        <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a7e74;margin:0 0 6px;">Notes</p>
        <p style="font-size:13px;color:#2c2621;margin:0;">${esc(sale.notes)}</p>
      </div>
    ` : "";

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PackingSlip_${refNum}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #fff; color: #2c2621; padding: 48px; max-width: 600px; margin: 0 auto; }
    @media print { .save-banner { display: none !important; } body { padding: 24px; } }
  </style>
</head>
<body>
  <div class="save-banner" style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:12px 16px;margin-bottom:28px;display:flex;align-items:center;gap:10px;">
    <span style="font-size:18px;">💡</span>
    <div>
      <p style="font-size:13px;font-weight:600;color:#92400e;margin:0 0 2px;">Save as PDF</p>
      <p style="font-size:12px;color:#b45309;margin:0;">In the print dialog, set the <strong>Destination</strong> to <strong>Save as PDF</strong>, then click Save.</p>
    </div>
  </div>

  <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #2c2621;padding-bottom:20px;margin-bottom:28px;">
    <div>
      <p style="font-size:22px;font-weight:700;letter-spacing:-.01em;">Kiln</p>
      <p style="font-size:11px;color:#8a7e74;margin-top:2px;">kilnfire.replit.app</p>
    </div>
    <div style="text-align:right;">
      <p style="font-size:18px;font-weight:700;font-family:monospace;">${refNum}</p>
      <p style="font-size:11px;color:#8a7e74;margin-top:2px;">Packing Slip</p>
    </div>
  </div>

  <div style="display:flex;justify-content:space-between;margin-bottom:28px;gap:24px;">
    <div>
      <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a7e74;margin-bottom:4px;">Date</p>
      <p style="font-size:13px;">${dateStr}</p>
    </div>
    <div>
      <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a7e74;margin-bottom:4px;">Status</p>
      <p style="font-size:13px;">${statusLabel}</p>
    </div>
    <div style="text-align:right;">
      <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a7e74;margin-bottom:4px;">Order type</p>
      <p style="font-size:13px;">${typeLabel}</p>
    </div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
    <thead>
      <tr>
        <th style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a7e74;padding-bottom:8px;border-bottom:1px solid #e7e3dc;text-align:left;">Item</th>
        <th style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a7e74;padding-bottom:8px;border-bottom:1px solid #e7e3dc;text-align:right;">Price</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #e7e3dc;font-size:13px;color:#2c2621;">${esc(sale.title)}${sale.description ? `<br><span style="font-size:11px;color:#8a7e74;">${esc(sale.description)}</span>` : ""}</td>
        <td style="padding:10px 0;border-bottom:1px solid #e7e3dc;text-align:right;font-size:13px;font-weight:600;color:#2c2621;white-space:nowrap;">${formatPrice(sale.amount)}</td>
      </tr>
    </tbody>
  </table>

  <div style="display:flex;justify-content:flex-end;padding-top:12px;border-top:2px solid #2c2621;margin-top:4px;">
    <div style="text-align:right;">
      <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a7e74;margin-bottom:4px;">Total</p>
      <p style="font-size:20px;font-weight:700;">${formatPrice(sale.amount)}</p>
    </div>
  </div>

  ${buyerSection}${processingWindowSection}${trackingSection}${notesSection}

  <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e7e3dc;text-align:center;">
    <p style="font-size:11px;color:#8a7e74;">Kiln — kilnfire.replit.app &nbsp;·&nbsp; Thank you for creating.</p>
  </div>
</body>
</html>`;

    const win = window.open("", "_blank", "width=700,height=900");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.document.title = `PackingSlip_${refNum}`;
    win.focus();
    setTimeout(() => win.print(), 400);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#12100e] flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-stone-600" />
      </div>
    );
  }

  if (notFound || !sale) {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <AlertCircle size={32} className="mx-auto mb-3 text-stone-700" />
          <p className="text-stone-400 text-sm mb-4">Sale not found.</p>
          <Link href="/earnings">
            <button className="rounded-full border border-white/10 px-5 py-2 text-sm text-stone-300 hover:border-amber-500/40 transition-colors">
              Back to Earnings
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const typeConf = TYPE_CONFIG[sale.type] ?? TYPE_CONFIG.inquiry!;
  const statusConf = STATUS_CONFIG[sale.status] ?? STATUS_CONFIG.pending!;
  const StatusIcon = statusConf.icon;
  const TypeIcon = typeConf.icon;

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

  const hasWindow = sale.processingWindowDays !== null || sale.processingWindowLabel !== null;
  const deliveryEstimateText = sale.processingWindowLabel?.trim()
    ? sale.processingWindowLabel
    : sale.processingWindowDays !== null
      ? sale.processingWindowDays === 1
        ? "1 business day"
        : `${sale.processingWindowDays} business days`
      : null;
  const windowText = deliveryEstimateText ? `Ships within ${deliveryEstimateText}` : null;

  const isPhysical = ["listing", "drop"].includes(sale.type);
  const canMarkInProgress = ["pending", "confirmed", "inquiry"].includes(sale.status);
  const canMarkShipped = sale.status === "in_progress" && isPhysical;
  const canMarkDelivered = sale.status === "shipped";
  const canUpdateTracking = ["shipped", "in_progress"].includes(sale.status) && isPhysical;
  const hasFulfillmentActions = canMarkInProgress || canMarkShipped || canMarkDelivered || canUpdateTracking;

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-lg px-4 pb-28 pt-6 md:pb-8">

        <div className="mb-6 flex items-center gap-3">
          <Link href="/earnings">
            <button className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-300 transition-colors">
              <ChevronLeft size={16} />
              Earnings
            </button>
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="font-serif text-2xl text-amber-100">Sale Detail</h1>
          <p className="mt-1 font-mono text-sm text-amber-400/70">{ordinalId(sale.id)}</p>
        </div>

        <div className={`mb-4 flex items-center gap-2.5 rounded-2xl border p-4 ${statusConf.bg}`}>
          <StatusIcon size={18} className={statusConf.color} />
          <div>
            <p className={`font-semibold text-sm ${statusConf.color}`}>{statusConf.label}</p>
            <p className="text-xs text-stone-500">
              Placed {formatDate(sale.createdAt)} at {formatTime(sale.createdAt)}
            </p>
          </div>
        </div>

        <div className="mb-4 rounded-2xl border border-white/8 bg-stone-900/50 p-4">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-stone-800">
              {sale.imageUrl ? (
                <img src={sale.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className={`h-full w-full flex items-center justify-center rounded-xl ${typeConf.color}`}>
                  <TypeIcon size={22} />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-stone-100 leading-snug">{sale.title}</p>
              {sale.description && (
                <p className="mt-0.5 text-xs text-stone-500 line-clamp-2">{sale.description}</p>
              )}
              <div className="mt-2 flex items-center justify-between">
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${typeConf.color}`}>{typeConf.label}</span>
                <span className="text-base font-bold text-emerald-400">+{formatPrice(sale.amount)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4 rounded-2xl border border-white/8 bg-stone-900/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">Buyer</p>
          <div className="flex items-center gap-3">
            {sale.buyerAvatarUrl ? (
              <img
                src={sale.buyerAvatarUrl}
                alt={buyerLabel}
                className="h-8 w-8 flex-shrink-0 rounded-full object-cover ring-1 ring-white/10"
              />
            ) : (
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-stone-700 text-xs font-semibold text-stone-300 ring-1 ring-white/10">
                {buyerInitial}
              </span>
            )}
            <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
              {buyerHref ? (
                <Link href={buyerHref}>
                  <span className="text-sm text-stone-300 hover:text-amber-300 transition-colors cursor-pointer">
                    {buyerLabel}
                  </span>
                </Link>
              ) : (
                <p className="text-sm text-stone-300">{buyerLabel}</p>
              )}
              {sale.buyerId && (
                <button
                  onClick={() => { const ref = ordinalId(sale.id); navigate(`/messages/${sale.buyerId}?prefill=${encodeURIComponent(`Hi! Following up on your order ${ref} — `)}&orderId=${sale.id}&orderRole=seller`); }}
                  className="flex items-center gap-1.5 rounded-lg border border-white/8 px-2.5 py-1.5 text-xs text-stone-400 hover:text-amber-300 hover:border-amber-500/30 hover:bg-amber-500/8 transition-colors flex-shrink-0"
                >
                  <MessageSquare size={12} />
                  Message buyer
                </button>
              )}
            </div>
          </div>
        </div>

        {hasFulfillmentActions && (
          <div className="mb-4 rounded-2xl border border-white/8 bg-stone-900/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-3">Fulfillment</p>

            {updateError && (
              <div className="mb-3 flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-2.5">
                <AlertCircle size={13} className="text-rose-400 shrink-0" />
                <p className="text-xs text-rose-300">{updateError}</p>
              </div>
            )}

            <div className="space-y-2">
              {canMarkInProgress && (
                <button
                  onClick={() => handleStatusUpdate("in_progress")}
                  disabled={updating}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 text-sm font-medium text-amber-300 hover:bg-amber-500/15 transition-colors disabled:opacity-50"
                >
                  {updating ? <Loader2 size={14} className="animate-spin" /> : <Package size={14} />}
                  Mark as In Progress
                </button>
              )}

              {canMarkShipped && !showTrackingInput && (
                <button
                  onClick={() => setShowTrackingInput(true)}
                  disabled={updating}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-500/10 border border-blue-500/20 px-4 py-2.5 text-sm font-medium text-blue-300 hover:bg-blue-500/15 transition-colors disabled:opacity-50"
                >
                  <Truck size={14} />
                  Mark as Shipped
                </button>
              )}

              {canMarkShipped && showTrackingInput && (
                <div className="rounded-xl bg-blue-500/8 border border-blue-500/15 p-3 space-y-2">
                  <p className="text-xs text-stone-400">Add shipping details (optional)</p>
                  <select
                    value={carrierInput}
                    onChange={e => setCarrierInput(e.target.value)}
                    className="w-full rounded-lg bg-stone-800/80 border border-white/8 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-blue-500/40"
                  >
                    {CARRIERS.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={trackingInput}
                    onChange={e => setTrackingInput(e.target.value)}
                    placeholder="Tracking number (e.g. 1Z999AA10123456784)"
                    className="w-full rounded-lg bg-stone-800/80 border border-white/8 px-3 py-2 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-blue-500/40"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStatusUpdate("shipped", trackingInput.trim() || undefined, carrierInput || undefined)}
                      disabled={updating}
                      className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-500/15 border border-blue-500/25 px-3 py-2 text-sm font-medium text-blue-300 hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                    >
                      {updating ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                      Confirm Shipped
                    </button>
                    <button
                      onClick={() => { setShowTrackingInput(false); setTrackingInput(""); setCarrierInput(""); }}
                      disabled={updating}
                      className="px-3 py-2 rounded-lg border border-white/8 text-sm text-stone-500 hover:text-stone-300 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {canMarkDelivered && (
                <button
                  onClick={() => handleStatusUpdate("delivered")}
                  disabled={updating}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 text-sm font-medium text-emerald-300 hover:bg-emerald-500/15 transition-colors disabled:opacity-50"
                >
                  {updating ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  Mark as Delivered
                </button>
              )}

              {canUpdateTracking && !showTrackingInput && (
                <button
                  onClick={() => { setTrackingInput(sale.trackingNumber ?? ""); setCarrierInput(sale.carrier ?? ""); setShowTrackingInput(true); }}
                  disabled={updating}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/8 px-4 py-2.5 text-sm text-stone-400 hover:text-stone-200 hover:border-white/15 transition-colors disabled:opacity-50"
                >
                  <Truck size={14} />
                  {sale.trackingNumber ? "Update tracking" : "Add tracking"}
                </button>
              )}

              {canUpdateTracking && showTrackingInput && !canMarkShipped && (
                <div className="rounded-xl bg-stone-800/50 border border-white/8 p-3 space-y-2">
                  <p className="text-xs text-stone-400">Shipping details</p>
                  <select
                    value={carrierInput}
                    onChange={e => setCarrierInput(e.target.value)}
                    className="w-full rounded-lg bg-stone-900/80 border border-white/8 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500/40"
                  >
                    {CARRIERS.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={trackingInput}
                    onChange={e => setTrackingInput(e.target.value)}
                    placeholder="Tracking number (e.g. 1Z999AA10123456784)"
                    className="w-full rounded-lg bg-stone-900/80 border border-white/8 px-3 py-2 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500/40"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleTrackingUpdate}
                      disabled={updating}
                      className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-amber-500/12 border border-amber-500/20 px-3 py-2 text-sm font-medium text-amber-300 hover:bg-amber-500/18 transition-colors disabled:opacity-50"
                    >
                      {updating ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                      Save Tracking
                    </button>
                    <button
                      onClick={() => { setShowTrackingInput(false); setTrackingInput(""); setCarrierInput(""); }}
                      disabled={updating}
                      className="px-3 py-2 rounded-lg border border-white/8 text-sm text-stone-500 hover:text-stone-300 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mb-4 rounded-2xl border border-white/8 bg-stone-900/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-3">Processing Window</p>
          {hasWindow ? (
            <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 bg-amber-500/8 border border-amber-500/15">
              <Clock size={14} className="text-amber-400/80 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-300">{windowText}</p>
                <p className="text-[11px] text-stone-500 mt-0.5">Stamped at time of purchase</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 bg-stone-800/50 border border-white/6">
              <Clock size={14} className="text-stone-600 shrink-0" />
              <div>
                <p className="text-sm text-stone-500">Not stamped</p>
                <p className="text-[11px] text-stone-600 mt-0.5">
                  No processing window was set when this order was placed.{" "}
                  <Link href="/settings?section=payments" className="text-amber-500/70 hover:text-amber-400 transition-colors">
                    Configure one in Settings.
                  </Link>
                </p>
              </div>
            </div>
          )}
        </div>

        {sale.manualPayout && (
          <div className="mb-4 rounded-2xl border border-amber-500/20 bg-amber-500/6 p-4">
            <div className="flex items-start gap-3">
              <DollarSign size={15} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-amber-200 font-semibold mb-1">Manual payout order</p>
                <p className="text-xs text-stone-400 leading-relaxed">
                  This order was placed under manual payout mode. Process it directly with the buyer.
                </p>
              </div>
            </div>
          </div>
        )}

        {sale.trackingNumber && (
          <div className="mb-4 rounded-2xl border border-white/8 bg-stone-900/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">Tracking</p>
            <div className="flex items-start gap-2">
              <Truck size={14} className="text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                {sale.carrier && (
                  <p className="text-xs text-stone-500">
                    Carrier: <span className="text-stone-300 font-medium">{CARRIERS.find(c => c.value === sale.carrier)?.label ?? sale.carrier.toUpperCase()}</span>
                  </p>
                )}
                <p className="text-sm text-stone-300">
                  <span className="font-mono text-stone-100">{sale.trackingNumber}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {sale.shippingAddress && (
          <div className="mb-4 rounded-2xl border border-white/8 bg-stone-900/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">Ship to</p>
            <div className="flex items-start gap-2">
              <MapPin size={14} className="text-stone-500 shrink-0 mt-0.5" />
              <div>
                {(sale.buyerDisplayName?.trim() || sale.buyerHandle) && (
                  <p className="text-sm font-medium text-stone-300 mb-0.5">
                    {sale.buyerDisplayName?.trim() || `@${sale.buyerHandle}`}
                  </p>
                )}
                <p className="text-sm text-stone-400 whitespace-pre-line">{sale.shippingAddress}</p>
              </div>
            </div>
          </div>
        )}

        {sale.notes && !sale.notes.startsWith("stripe:") && (
          <div className="mb-4 rounded-2xl border border-white/8 bg-stone-900/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">Notes</p>
            <div className="flex items-start gap-2">
              <FileText size={14} className="text-stone-500 shrink-0 mt-0.5" />
              <p className="text-sm text-stone-400">{sale.notes}</p>
            </div>
          </div>
        )}

        <div className="mt-6 space-y-3">
          <div className="flex gap-2">
            <button
              onClick={handlePrintPackingSlip}
              className="flex-1 flex items-center justify-center gap-2 rounded-full border border-white/10 py-2.5 text-sm text-stone-300 hover:border-amber-500/40 hover:text-amber-200 transition-colors"
            >
              <Printer size={15} />
              Print packing slip
            </button>
            <button
              onClick={handleDownloadPackingSlipPDF}
              className="flex-1 flex items-center justify-center gap-2 rounded-full border border-white/10 py-2.5 text-sm text-stone-300 hover:border-amber-500/40 hover:text-amber-200 transition-colors"
            >
              <Download size={15} />
              Download PDF
            </button>
          </div>
          <Link href="/earnings">
            <button className="w-full rounded-full border border-white/10 py-2.5 text-sm text-stone-300 hover:border-amber-500/40 transition-colors">
              Back to Earnings
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
