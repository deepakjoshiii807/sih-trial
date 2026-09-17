export interface HeatmapRow {
  label: string;
  values: number[];
}

interface DepartmentHeatmapProps {
  columns: string[];
  rows: HeatmapRow[];
  /** Optional per-column suffix (e.g. "%"). */
  suffixes?: string[];
  /** Caption for screen readers. */
  caption?: string;
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Linear interpolation between two hex colors. */
function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const k = clamp01(t);
  const r = Math.round(r1 + (r2 - r1) * k);
  const g = Math.round(g1 + (g2 - g1) * k);
  const bl = Math.round(b1 + (b2 - b1) * k);
  return `rgb(${r}, ${g}, ${bl})`;
}

const LOW = "#EFF4EA";
const HIGH = "#244B35";

/**
 * Department × metric heatmap. Columns are normalised independently, so a
 * count column (avg skills) and a percentage column can share one grid.
 * Rendered as a real table for accessibility + print friendliness.
 */
export default function DepartmentHeatmap({ columns, rows, suffixes = [], caption = "Department performance heatmap" }: DepartmentHeatmapProps) {
  const ranges = columns.map((_, c) => {
    const vals = rows.map((r) => r.values[c] ?? 0);
    return { min: Math.min(...vals), max: Math.max(...vals) };
  });

  return (
    <div className="rounded-[18px] border bg-white p-5 sm:p-6" style={{ borderColor: "#E6E3D7" }}>
      <table className="w-full border-separate" style={{ borderSpacing: "4px" }}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col" className="text-left font-mono text-[10px] font-bold tracking-widest uppercase px-2 py-1" style={{ color: "#9A9D94" }}>
              Department
            </th>
            {columns.map((c, i) => (
              <th key={c ?? i} scope="col" className="font-mono text-[10px] font-bold tracking-widest uppercase px-2 py-1 text-center" style={{ color: "#9A9D94" }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <th scope="row" className="text-left font-semibold text-[13px] px-2 py-2 whitespace-nowrap" style={{ color: "#171A18" }}>
                {r.label}
              </th>
              {columns.map((_, c) => {
                const v = r.values[c] ?? 0;
                const { min, max } = ranges[c];
                const t = max > min ? (v - min) / (max - min) : 0.5;
                return (
                  <td
                    key={c}
                    className="rounded-lg px-2 py-2 text-center font-mono text-[12px] font-bold"
                    style={{ background: mix(LOW, HIGH, t), color: t > 0.55 ? "#F2F7EE" : "#16301F" }}
                    title={`${r.label} · ${columns[c]}: ${v}${suffixes[c] ?? ""}`}
                  >
                    {v}
                    {suffixes[c] ?? ""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex items-center justify-end gap-2">
        <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color: "#9A9D94" }}>Lower</span>
        <span
          aria-hidden
          className="h-2.5 w-28 rounded-full"
          style={{ background: `linear-gradient(90deg, ${LOW}, ${HIGH})` }}
        />
        <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color: "#9A9D94" }}>Higher</span>
      </div>
    </div>
  );
}
