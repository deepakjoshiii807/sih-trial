/** Shimmer skeleton primitives. Styled via .l2l-skeleton in index.css. */

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`l2l-skeleton ${className}`} />;
}

/** Card-shaped skeleton block. */
export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="l2l-skeleton rounded-[18px] p-5 md:p-6" style={{ minHeight: 140 }}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-12" />
      </div>
      <Skeleton className="mt-4 h-4 w-3/4" />
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className="mt-2.5 h-3 w-full" />
      ))}
    </div>
  );
}

/** Row list (e.g. opportunities, candidates, scholarships). */
export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="grid gap-3" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="rounded-xl border p-4" style={{ borderColor: "#E6E3D7" }}>
          <div className="flex items-center gap-3">
            <div className="l2l-skeleton h-10 w-10 rounded-lg shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="l2l-skeleton h-3.5 w-2/3" />
              <div className="l2l-skeleton mt-2 h-3 w-1/3" />
            </div>
            <div className="l2l-skeleton h-6 w-14 rounded-md shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Data table (skills, placements, departments). */
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full" aria-hidden>
      <div className="flex gap-3 border-b pb-3" style={{ borderColor: "#E6E3D7" }}>
        {Array.from({ length: cols }, (_, c) => (
          <div key={c} className="l2l-skeleton h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex gap-3 border-b py-3.5" style={{ borderColor: "#EDEBE0" }}>
          {Array.from({ length: cols }, (_, c) => (
            <div key={c} className="l2l-skeleton h-3 flex-1" style={{ maxWidth: c === 0 ? "38%" : undefined }} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Chart / analytics panel. */
export function ChartSkeleton({ height = 220 }: { height?: number }) {
  return (
    <div className="w-full" style={{ height }} aria-hidden>
      <div className="flex h-full items-end gap-2.5 px-1">
        {[38, 62, 48, 80, 56, 92, 70, 44, 66].map((h, i) => (
          <div key={i} className="l2l-skeleton flex-1 rounded-t-md" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

/** Grid of stat cards. */
export function StatGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="l2l-skeleton rounded-[18px] p-5" style={{ minHeight: 96 }}>
          <div className="l2l-skeleton h-3 w-20" />
          <div className="l2l-skeleton mt-3 h-6 w-14" />
        </div>
      ))}
    </div>
  );
}

/**
 * Dashboard-shaped loading screen: left nav rail + header + a grid of cards,
 * so the first paint looks like the actual workspace instead of a spinner.
 */
export function DashboardSkeleton({ label = "Loading your dashboard…" }: { label?: string }) {
  return (
    <div className="flex min-h-screen bg-[#F7F6F0]" style={{ background: "#F7F6F0" }}>
      {/* Sidebar rail */}
      <div className="hidden md:flex w-[264px] shrink-0 flex-col gap-4 border-r p-4" style={{ borderColor: "#E6E3D7", background: "#F7F6F0" }}>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-auto h-8 w-24" />
      </div>

      <div className="flex-1 min-w-0 p-5 md:p-8">
        <span className="sr-only">{label}</span>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-8 w-8 rounded-xl" />
        </div>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <CardSkeleton lines={2} />
          <CardSkeleton lines={2} />
          <CardSkeleton lines={2} />
          <CardSkeleton lines={2} />
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2"><CardSkeleton lines={5} /></div>
          <CardSkeleton lines={4} />
        </div>
      </div>
    </div>
  );
}
