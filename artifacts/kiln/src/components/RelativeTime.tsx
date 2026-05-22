import { useEffect, useState } from "react";

export function relativeLabel(since: Date | string | number): string {
  const date = since instanceof Date ? since : new Date(since);
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin === 1) return "1 min ago";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr === 1) return "1 hr ago";
  if (diffHr < 24) return `${diffHr} hr ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "1 day ago";
  return `${diffDay} days ago`;
}

interface RelativeTimeProps {
  since: Date | string | number;
  className?: string;
  intervalMs?: number;
}

export default function RelativeTime({ since, className = "text-xs text-stone-500", intervalMs = 30_000 }: RelativeTimeProps) {
  const date = since instanceof Date ? since : new Date(since);
  const [label, setLabel] = useState(() => relativeLabel(date));

  useEffect(() => {
    const id = setInterval(() => setLabel(relativeLabel(date)), intervalMs);
    return () => clearInterval(id);
  }, [date, intervalMs]);

  return <span className={className}>{label}</span>;
}
