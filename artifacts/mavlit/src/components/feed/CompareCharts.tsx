import { Bar, BarChart, Legend, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const SERIES_COLORS = ["#8b5cf6", "#38bdf8", "#f59e0b", "#10b981"];   // You first, then up to three others
const TOOLTIP_STYLE = { background: "#15151c", border: "1px solid #2a2a33", borderRadius: 12, fontSize: 12, color: "#fff" };
const AXIS = { fill: "#a1a1aa", fontSize: 11 };

/** Horizontal stacked bars: one row per creator, one segment per category (percent). */
export function MixBars({ rows, keys, label, height = 220 }: { rows: Record<string, string | number>[]; keys: string[]; label: string; height?: number }) {
  const palette = ["#8b5cf6", "#38bdf8", "#f59e0b", "#10b981", "#ec4899", "#94a3b8"];
  return (
    <div style={{ height }} role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 12 }}>
          <XAxis type="number" domain={[0, 100]} unit="%" tick={AXIS} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" width={104} tick={{ ...AXIS, fill: "#e4e4e7", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {keys.map((k, i) => <Bar key={k} dataKey={k} stackId="mix" fill={palette[i % palette.length]} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Radar where every axis is scaled so the larger value among the people compared is 100. */
export function IndexRadar({ axes, series, label }: { axes: string[]; series: { name: string; color: string; values: number[] }[]; label: string }) {
  const data = axes.map((axis, i) => ({ axis, ...Object.fromEntries(series.map((s) => [s.name, s.values[i]])) }));
  return (
    <div className="h-72" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="70%">
          <PolarGrid stroke="#2a2a33" /><PolarAngleAxis dataKey="axis" tick={AXIS} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          {series.map((s) => <Radar key={s.name} name={s.name} dataKey={s.name} stroke={s.color} fill={s.color} fillOpacity={0.22} />)}
          <Legend wrapperStyle={{ fontSize: 12 }} /><Tooltip contentStyle={TOOLTIP_STYLE} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Grouped bars comparing one metric across people. */
export function MetricBars({ data, label, unit = "" }: { data: { name: string; value: number; color: string }[]; label: string; unit?: string }) {
  return (
    <div className="h-48" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: -12, right: 8, top: 8 }}>
          <XAxis dataKey="name" tick={AXIS} axisLine={false} tickLine={false} interval={0} />
          <YAxis tick={AXIS} axisLine={false} tickLine={false} unit={unit} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
          <Bar dataKey="value" radius={[6, 6, 0, 0]}
            shape={(props: { x?: number; y?: number; width?: number; height?: number; payload?: { color: string } }) => (
              <rect x={props.x} y={props.y} width={props.width} height={props.height} rx={6} fill={props.payload?.color} />
            )} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
