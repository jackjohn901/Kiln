import { useEffect } from "react";

interface MetaOptions {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
}

function setMeta(property: string, content: string) {
  let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setMetaName(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export function useMeta({ title, description, image, url }: MetaOptions) {
  useEffect(() => {
    const base = "Kiln — Craft Creator Platform";
    const fullTitle = title ? `${title} · ${base}` : base;
    const desc = description ?? "Discover craft artists. Buy original works. Book workshops. Support makers directly.";
    const img = image ?? "/og-default.jpg";
    const canonical = url ?? window.location.href;

    document.title = fullTitle;

    setMeta("og:title", fullTitle);
    setMeta("og:description", desc);
    setMeta("og:image", img);
    setMeta("og:url", canonical);
    setMeta("og:type", "website");

    setMetaName("description", desc);
    setMetaName("twitter:card", "summary_large_image");
    setMetaName("twitter:title", fullTitle);
    setMetaName("twitter:description", desc);
    setMetaName("twitter:image", img);

    return () => {
      document.title = base;
    };
  }, [title, description, image, url]);
}
