import { AlertTriangle } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#12100e] text-white">
      <div className="text-center px-4 max-w-md">
        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Page Not Found</h1>
        <p className="text-stone-400 text-sm mb-6">
          That page doesn't exist. You might be looking for something that was moved or never existed.
        </p>
        <Link href="/">
          <button className="px-5 py-2 rounded-full bg-amber-500 text-stone-950 text-sm font-semibold hover:bg-amber-400 transition-colors">
            Back to Home
          </button>
        </Link>
      </div>
    </div>
  );
}
