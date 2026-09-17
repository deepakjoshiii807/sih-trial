import { AlertTriangle, RefreshCw } from "lucide-react";
import { DashboardSkeleton } from "@/components/ui/skeleton";

/** Shown while a dashboard fetches its data from the API. */
export function DashboardLoader({ label = "Loading your dashboard…" }: { label?: string }) {
  return <DashboardSkeleton label={label} />;
}

/**
 * Shown when the API call fails (e.g. backend unreachable).
 *
 * `onSecondary` is the escape hatch for trial/demo situations: instead of a
 * dead end, the visitor can keep exploring the workspace on bundled seed data.
 */
export function DashboardError({
  message,
  onRetry,
  secondaryLabel,
  onSecondary,
}: {
  message: string;
  onRetry?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F6F0] px-6" style={{ background: "#F7F6F0" }}>
      <div className="max-w-md rounded-2xl border border-[#E8C7AE] bg-white p-8 text-center" style={{ borderColor: "#E8C7AE", background: "#fff" }}>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#F0E8DD]" style={{ background: "#F0E8DD" }}>
          <AlertTriangle className="h-5 w-5 text-[#7a3f1a]" />
        </div>
        <h2 className="text-lg font-semibold tracking-tight text-[#171A18]" style={{ color: "#171A18" }}>Couldn't load your workspace</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#6B6F68]" style={{ color: "#6B6F68" }}>{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#244B35] px-4 py-2.5 text-sm font-semibold text-[#DCE6D0] transition-all hover:opacity-90"
            style={{ background: "#244B35", color: "#DCE6D0" }}
          >
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
        )}
        {secondaryLabel && onSecondary && (
          <button
            type="button"
            onClick={onSecondary}
            className="mt-3 block w-full rounded-xl border border-[#E6E3D7] px-4 py-2.5 text-sm font-semibold text-[#244B35] transition-all hover:bg-[#F7F6F0]"
            style={{ borderColor: "#E6E3D7", color: "#244B35" }}
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}