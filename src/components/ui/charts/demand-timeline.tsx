import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface DemandTimelinePoint {
  month: string;
  [skill: string]: number | string;
}

export interface DemandSkill {
  key: string;
  color: string;
}

interface DemandTimelineProps {
  data: DemandTimelinePoint[];
  skills: DemandSkill[];
  height?: number;
  /** Y-axis label shown above the plot. */
  yLabel?: string;
}

/**
 * Opportunity demand timeline — monthly openings per skill. Recharts area chart
 * tuned for the dashboard palette; dark-mode axis/grid/tooltip colors come from
 * the global `.dark .recharts-*` rules in index.css.
 */
export default function DemandTimeline({ data, skills, height = 260 }: DemandTimelineProps) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
          <defs>
            {skills.map((s) => {
              const id = `demand-${s.key.replace(/\W+/g, "")}`;
              return (
                <linearGradient key={s.key} id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={s.color} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={s.color} stopOpacity={0.02} />
                </linearGradient>
              );
            })}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,130,140,0.22)" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={34} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {skills.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stroke={s.color}
              strokeWidth={2}
              fill={`url(#demand-${s.key.replace(/\W+/g, "")})`}
              activeDot={{ r: 4 }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
