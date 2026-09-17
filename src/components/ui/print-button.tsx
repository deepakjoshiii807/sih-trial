import { Printer } from "lucide-react";

/**
 * Print / Save-as-PDF button. Uses the global print CSS: when a report modal
 * is open only that report prints, otherwise the current view prints cleanly.
 */
export default function PrintButton({ className = "" }: { className?: string }) {
  const label = "Print / Save as PDF";

  return (
    <button
      type="button"
      onClick={() => window.print()}
      aria-label={label}
      title={label}
      className={`w-9 h-9 rounded-xl border bg-white flex items-center justify-center hover:bg-[#EFEDE3] transition-colors ${className}`}
      style={{ borderColor: "#E6E3D7", color: "#6B6F68" }}
    >
      <Printer size={16} />
    </button>
  );
}
