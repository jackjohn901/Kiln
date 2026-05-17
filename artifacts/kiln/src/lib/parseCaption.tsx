import { Link } from "wouter";

export function ParsedCaption({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(#\w+|@[\w][\w.-]*)/g);
  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.startsWith("#")) {
          const tag = part.slice(1);
          return (
            <Link key={i} href={`/tag/${encodeURIComponent(tag)}`}>
              <span className="text-amber-400 hover:text-amber-300 cursor-pointer transition-colors">
                {part}
              </span>
            </Link>
          );
        }
        if (part.startsWith("@")) {
          const handle = part.slice(1);
          return (
            <Link key={i} href={`/profile/${encodeURIComponent(handle)}`}>
              <span className="text-sky-400 hover:text-sky-300 cursor-pointer transition-colors">
                {part}
              </span>
            </Link>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}
