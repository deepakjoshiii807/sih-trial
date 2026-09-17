import { RefreshCw } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Demo preview wrapper: renders a role dashboard straight from its bundled seed
 * data so the UI can be explored without the Django backend running. Clearly
 * labelled so it is never mistaken for live data.
 *
 * Signed-out visitors get this automatically (see RequireRole's `demo` prop);
 * signed-in users can opt into it from the "Couldn't load your workspace"
 * screen, which is why `onRetry` is optional.
 */
export function DemoFrame({ children, onRetry }: { children: ReactNode; onRetry?: () => void }) {
  return (
    <>
      {children}
      <div className="pointer-events-none fixed bottom-4 left-1/2 z-[60] -translate-x-1/2">
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-[#244B35]/20 bg-[#244B35] px-3 py-1.5 font-mono text-[11px] tracking-wide text-white/95 shadow-lg">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
          DEMO PREVIEW · SAMPLE DATA · BACKEND NOT CONNECTED
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="ml-1 inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 font-sans text-[11px] font-semibold transition-colors hover:bg-white/25"
            >
              <RefreshCw className="h-3 w-3" /> Retry
            </button>
          )}
        </div>
      </div>
    </>
  );
}
