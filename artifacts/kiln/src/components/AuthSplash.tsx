import { Flame } from "lucide-react";

export default function AuthSplash({ label = "Loading\u2026" }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-5 bg-stone-950">
      <div className="relative flex items-center justify-center">
        <span className="absolute inline-flex h-16 w-16 animate-ping rounded-full bg-amber-500/20" />
        <Flame size={40} className="relative text-amber-400" />
      </div>
      <span className="font-serif text-2xl font-bold tracking-tight text-amber-100">Kiln</span>
      <span className="text-sm text-stone-400">{label}</span>
    </div>
  );
}
