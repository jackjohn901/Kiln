import { FlaskConical } from "lucide-react";

export default function BetaBanner({ label = "Preview feature" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-xs text-sky-300">
      <FlaskConical size={13} />
      <span>
        {label} — preview feature. Data stays on this device only. Full sync coming soon.
      </span>
    </div>
  );
}
