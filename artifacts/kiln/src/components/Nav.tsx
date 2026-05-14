import { Link, useLocation } from "wouter";
import { Search, Bell, User } from "lucide-react";

export default function Nav() {
  const [location] = useLocation();

  const links = [
    { href: "/", label: "Feed" },
    { href: "/artists", label: "Artists" },
    { href: "/shop", label: "Shop" },
  ];

  return (
    <header
      data-testid="nav-header"
      className="sticky top-0 z-50 w-full border-b border-border/50"
      style={{ background: "hsl(20 8% 8% / 0.92)", backdropFilter: "blur(16px)" }}
    >
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" data-testid="nav-logo">
          <span className="font-serif text-xl tracking-wide text-foreground hover:text-primary transition-colors cursor-pointer">
            Kiln
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {links.map((l) => {
            const active = location === l.href || (l.href !== "/" && location.startsWith(l.href));
            return (
              <Link key={l.href} href={l.href} data-testid={`nav-link-${l.label.toLowerCase()}`}>
                <span
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer ${
                    active
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
                >
                  {l.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <button
            data-testid="nav-search"
            className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
          >
            <Search size={16} />
          </button>
          <button
            data-testid="nav-notifications"
            className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
          >
            <Bell size={16} />
          </button>
          <button
            data-testid="nav-profile"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/20 text-primary hover:bg-primary/30 transition-all"
          >
            <User size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}
