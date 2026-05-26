import { useState, useRef, useEffect } from "react";
import { useSearch } from "wouter";
import { motion } from "framer-motion";
import { FileText, Download, Printer, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import Nav from "@/components/Nav";

interface ContractFields {
  artistName: string;
  artistEmail: string;
  clientName: string;
  clientEmail: string;
  projectDescription: string;
  medium: string;
  dimensions: string;
  totalPrice: string;
  depositPercent: string;
  deliveryWeeks: string;
  revisions: string;
  paymentMethod: string;
  specialTerms: string;
}

const EMPTY: ContractFields = {
  artistName: "",
  artistEmail: "",
  clientName: "",
  clientEmail: "",
  projectDescription: "",
  medium: "",
  dimensions: "",
  totalPrice: "",
  depositPercent: "50",
  deliveryWeeks: "8",
  revisions: "2",
  paymentMethod: "Bank transfer, check, or Stripe",
  specialTerms: "",
};

function today() {
  return new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function formatCurrency(val: string) {
  const n = parseFloat(val);
  if (isNaN(n)) return "$0.00";
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getDepositAmount(total: string, pct: string) {
  const t = parseFloat(total);
  const p = parseFloat(pct);
  if (isNaN(t) || isNaN(p)) return "$0.00";
  return formatCurrency(String((t * p) / 100));
}

function getBalance(total: string, pct: string) {
  const t = parseFloat(total);
  const p = parseFloat(pct);
  if (isNaN(t) || isNaN(p)) return "$0.00";
  return formatCurrency(String(t * (1 - p / 100)));
}

export default function CommissionContract() {
  const search = useSearch();
  const [fields, setFields] = useState<ContractFields>(EMPTY);
  const [generated, setGenerated] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const contractRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(search);
    const next: Partial<ContractFields> = {};
    const artistName = params.get("artistName");
    const clientName = params.get("clientName");
    const projectDescription = params.get("projectDescription");
    const totalPrice = params.get("totalPrice");
    const medium = params.get("medium");
    if (artistName) next.artistName = artistName;
    if (clientName) next.clientName = clientName;
    if (projectDescription) next.projectDescription = projectDescription;
    if (totalPrice) next.totalPrice = totalPrice;
    if (medium) next.medium = medium;
    if (Object.keys(next).length > 0) {
      setFields(f => ({ ...f, ...next }));
    }
  }, [search]);

  function set(k: keyof ContractFields, v: string) {
    setFields((f) => ({ ...f, [k]: v }));
  }

  function isReady() {
    return fields.artistName && fields.clientName && fields.projectDescription && fields.totalPrice;
  }

  function handleGenerate() {
    setGenerated(true);
    setShowForm(false);
    setTimeout(() => contractRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-3xl px-4 pb-32 pt-6 print:pt-0 print:px-0 print:max-w-full">

        {/* Header — hidden on print */}
        <div className="print:hidden mb-6">
          <div className="flex items-center gap-3 mb-1">
            <FileText size={20} className="text-amber-400" />
            <h1 className="font-serif text-2xl text-amber-100">Commission Contract Generator</h1>
          </div>
          <p className="text-sm text-stone-500 ml-8">Fill in the details below to generate a printable PDF commission agreement.</p>
        </div>

        {/* Form */}
        <div className="print:hidden mb-6">
          <button
            onClick={() => setShowForm((s) => !s)}
            className="w-full flex items-center justify-between rounded-2xl border border-white/8 bg-stone-900/60 px-5 py-4 text-sm font-semibold text-stone-300 hover:border-white/15 transition-colors"
          >
            <span>Contract Details</span>
            {showForm ? <ChevronUp size={16} className="text-stone-500" /> : <ChevronDown size={16} className="text-stone-500" />}
          </button>

          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 rounded-2xl border border-white/8 bg-stone-900/60 p-5 space-y-5"
            >
              <Section title="Artist Information">
                <Row>
                  <Field label="Artist full name *" value={fields.artistName} onChange={(v) => set("artistName", v)} />
                  <Field label="Artist email" type="email" value={fields.artistEmail} onChange={(v) => set("artistEmail", v)} />
                </Row>
              </Section>

              <Section title="Client Information">
                <Row>
                  <Field label="Client full name *" value={fields.clientName} onChange={(v) => set("clientName", v)} />
                  <Field label="Client email" type="email" value={fields.clientEmail} onChange={(v) => set("clientEmail", v)} />
                </Row>
              </Section>

              <Section title="Project Scope">
                <TextArea label="Project description *" value={fields.projectDescription} onChange={(v) => set("projectDescription", v)} rows={3} />
                <Row>
                  <Field label="Medium / materials" value={fields.medium} onChange={(v) => set("medium", v)} />
                  <Field label="Dimensions / size" value={fields.dimensions} onChange={(v) => set("dimensions", v)} />
                </Row>
              </Section>

              <Section title="Payment & Timeline">
                <Row>
                  <Field label="Total price (USD) *" type="number" value={fields.totalPrice} onChange={(v) => set("totalPrice", v)} />
                  <Field label="Deposit %" value={fields.depositPercent} onChange={(v) => set("depositPercent", v)} />
                </Row>
                <Row>
                  <Field label="Delivery (weeks)" value={fields.deliveryWeeks} onChange={(v) => set("deliveryWeeks", v)} />
                  <Field label="Revisions included" value={fields.revisions} onChange={(v) => set("revisions", v)} />
                </Row>
                <Field label="Accepted payment methods" value={fields.paymentMethod} onChange={(v) => set("paymentMethod", v)} />
              </Section>

              <Section title="Additional Terms (optional)">
                <TextArea label="Special terms or notes" value={fields.specialTerms} onChange={(v) => set("specialTerms", v)} rows={2} />
              </Section>

              <button
                disabled={!isReady()}
                onClick={handleGenerate}
                className="w-full flex items-center justify-center gap-2 rounded-full bg-amber-500 py-3 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FileText size={14} /> Generate Contract
              </button>
            </motion.div>
          )}
        </div>

        {/* Generated Contract */}
        {generated && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            {/* Print actions */}
            <div className="print:hidden flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2 text-emerald-400 text-sm">
                <CheckCircle size={16} /> Contract ready
              </div>
              <div className="flex-1" />
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-stone-300 hover:border-white/30 transition-colors"
              >
                <Printer size={13} /> Print / Save PDF
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-xs font-bold text-stone-950 hover:bg-amber-400 transition-colors"
              >
                <Download size={13} /> Download PDF
              </button>
            </div>

            {/* The actual contract (printable) */}
            <div
              ref={contractRef}
              className="rounded-2xl border border-white/8 bg-white print:rounded-none print:border-none text-stone-900 p-8 print:p-12 space-y-6 font-serif"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: "#1a1a1a" }}
            >
              <div className="text-center border-b border-stone-200 pb-6">
                <h1 className="text-2xl font-bold uppercase tracking-widest mb-1">Commission Agreement</h1>
                <p className="text-sm text-stone-500">Entered into as of {today()}</p>
              </div>

              <div className="grid grid-cols-2 gap-8 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wider text-stone-400 mb-1">Artist</p>
                  <p className="font-semibold">{fields.artistName || "[Artist Name]"}</p>
                  {fields.artistEmail && <p className="text-stone-500">{fields.artistEmail}</p>}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-stone-400 mb-1">Client</p>
                  <p className="font-semibold">{fields.clientName || "[Client Name]"}</p>
                  {fields.clientEmail && <p className="text-stone-500">{fields.clientEmail}</p>}
                </div>
              </div>

              <ContractSection number="1" title="Scope of Work">
                <p>The Artist agrees to create the following commissioned work for the Client:</p>
                <p className="mt-2 italic border-l-2 border-stone-300 pl-4">{fields.projectDescription || "[Description]"}</p>
                {(fields.medium || fields.dimensions) && (
                  <p className="mt-2 text-sm text-stone-600">
                    {fields.medium && <><strong>Medium:</strong> {fields.medium}. </>}
                    {fields.dimensions && <><strong>Dimensions:</strong> {fields.dimensions}.</>}
                  </p>
                )}
              </ContractSection>

              <ContractSection number="2" title="Payment">
                <ul className="space-y-1 list-none text-sm">
                  <li><strong>Total Price:</strong> {formatCurrency(fields.totalPrice)}</li>
                  <li><strong>Deposit ({fields.depositPercent}%):</strong> {getDepositAmount(fields.totalPrice, fields.depositPercent)} — due upon signing this agreement.</li>
                  <li><strong>Balance ({100 - parseFloat(fields.depositPercent || "50")}%):</strong> {getBalance(fields.totalPrice, fields.depositPercent)} — due upon completion and before delivery.</li>
                  <li><strong>Accepted payment methods:</strong> {fields.paymentMethod}.</li>
                </ul>
              </ContractSection>

              <ContractSection number="3" title="Timeline">
                <p>The Artist will deliver the completed work within approximately <strong>{fields.deliveryWeeks} weeks</strong> of receiving the deposit. Timeline may be adjusted by mutual written agreement.</p>
              </ContractSection>

              <ContractSection number="4" title="Revisions">
                <p>This agreement includes <strong>{fields.revisions} round{parseInt(fields.revisions) !== 1 ? "s" : ""} of revisions</strong>. Revisions are defined as minor adjustments to the agreed design. Additional revisions or significant changes to the scope may incur extra fees agreed upon in writing.</p>
              </ContractSection>

              <ContractSection number="5" title="Ownership & Copyright">
                <p>Upon receipt of full payment, the Client receives ownership of the physical artwork. The Artist retains all copyright and reproduction rights unless explicitly transferred in a separate written agreement. The Artist reserves the right to photograph and display the work in their portfolio.</p>
              </ContractSection>

              <ContractSection number="6" title="Cancellation">
                <p>If the Client cancels after work has begun, the deposit is non-refundable. If the Artist is unable to complete the work, a pro-rated refund of any payments received will be issued based on work completed.</p>
              </ContractSection>

              {fields.specialTerms && (
                <ContractSection number="7" title="Additional Terms">
                  <p>{fields.specialTerms}</p>
                </ContractSection>
              )}

              <ContractSection number={fields.specialTerms ? "8" : "7"} title="Entire Agreement">
                <p>This contract constitutes the entire agreement between the Artist and Client and supersedes all prior discussions. Any modifications must be made in writing and signed by both parties.</p>
              </ContractSection>

              {/* Signature lines */}
              <div className="grid grid-cols-2 gap-12 pt-6 border-t border-stone-200">
                <div className="space-y-8">
                  <div>
                    <div className="border-b border-stone-400 h-8 mb-1" />
                    <p className="text-xs text-stone-500">Artist signature</p>
                    <p className="text-sm font-semibold mt-1">{fields.artistName || "[Artist Name]"}</p>
                  </div>
                  <div>
                    <div className="border-b border-stone-400 h-8 mb-1" />
                    <p className="text-xs text-stone-500">Date</p>
                  </div>
                </div>
                <div className="space-y-8">
                  <div>
                    <div className="border-b border-stone-400 h-8 mb-1" />
                    <p className="text-xs text-stone-500">Client signature</p>
                    <p className="text-sm font-semibold mt-1">{fields.clientName || "[Client Name]"}</p>
                  </div>
                  <div>
                    <div className="border-b border-stone-400 h-8 mb-1" />
                    <p className="text-xs text-stone-500">Date</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">{title}</p>
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-xs text-stone-500 mb-1 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none transition-colors"
      />
    </div>
  );
}

function TextArea({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <div>
      <label className="text-xs text-stone-500 mb-1 block">{label}</label>
      <textarea
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none transition-colors resize-none"
      />
    </div>
  );
}

function ContractSection({ number, title, children }: { number: string | number; title: string; children: React.ReactNode }) {
  return (
    <div className="text-sm text-stone-700 space-y-2">
      <h3 className="font-bold text-stone-900">{number}. {title}</h3>
      {children}
    </div>
  );
}
