import { useState, type ReactNode } from "react";
import { Redirect } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { LogOut } from "lucide-react";
import { isAdmin, useAuth } from "@/contexts/AuthContext";
import { ApiRequestError } from "@/lib/api";
import { USAGE_DAY_CHOICES, getUsageSummary, money, type UsageCall, type UsageRow, type UsageSummary } from "@/lib/usage";

const OPENAI = "#7c3aed";
const APIFY = "#f59e0b";
const DANGER = "#ef4444";
const PALETTE = ["#7c3aed", "#0ea5e9", "#10b981", "#f59e0b", "#ec4899", "#14b8a6", "#8b5cf6", "#ef4444"];

// The lines of the "Feature use per day" chart, in the order the server sends them (labels as the admin knows the features).
export const FEATURE_LINES: { key: string; label: string; color: string }[] = [
  { key: "matches", label: "Matches", color: "#7c3aed" },
  { key: "rate", label: "Rate intelligence", color: "#38bdf8" },
  { key: "pitch", label: "Pitch", color: "#10b981" },
  { key: "description", label: "Description made by MAVLIT", color: "#f59e0b" },
  { key: "post_added", label: "Add post", color: "#ec4899" },
  { key: "post_removed", label: "Delete post", color: "#ef4444" },
  { key: "own_brand", label: "Add own brand", color: "#a3e635" },
  { key: "contacts", label: "View brands (contacts)", color: "#fb923c" },
  { key: "saved", label: "Saved brands", color: "#94a3b8" },
];
type FeatureMode = "users" | "uses";
type FeaturePrefs = { mode: FeatureMode; lines: string[] };   // what the admin chose: users or uses, and which lines are drawn
const TOOLTIP_STYLE = { background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12, color: "#f4f4f5" };
const TOOLTIP_LABEL = { color: "#f4f4f5", fontWeight: 600, marginBottom: 4 };
const AMOUNT = "#fbbf24";   // the number in a tooltip: its own colour, readable on the dark box

type TipRow = { name?: string | number; value?: number | string; color?: string; payload?: Record<string, unknown> };
/** Tooltip box: light name, the amount in AMOUNT. `amount` formats the value; `extra` adds a muted line under the rows. */
export function ChartTip({ active, payload, label, amount, extra }: {
  active?: boolean; payload?: TipRow[]; label?: string | number; amount: (v: number, row: TipRow) => string; extra?: (row: TipRow) => string | null;
}) {
  if (!active || !payload?.length) return null;
  const note = extra ? extra(payload[0]) : null;
  return (
    <div style={TOOLTIP_STYLE} className="px-3 py-2">
      <p style={TOOLTIP_LABEL}>{label ?? String(payload[0].payload?.name ?? "")}</p>
      {payload.map((row, i) => (
        <p key={i} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5" style={{ color: "#e4e4e7" }}>
            {row.color && <span className="inline-block w-2 h-2 rounded-sm" style={{ background: row.color }} />}{row.name}
          </span>
          <strong style={{ color: AMOUNT }}>{amount(Number(row.value ?? 0), row)}</strong>
        </p>
      ))}
      {note && <p style={{ color: "#a1a1aa", marginTop: 4 }}>{note}</p>}
    </div>
  );
}

function Panel({ title, action, children, className = "" }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-border bg-secondary/40 p-5 min-w-0 ${className}`}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-sm font-bold text-white">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Empty({ text = "No data yet." }: { text?: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}

function Stat({ label, value, note, testId }: { label: string; value: string; note?: string; testId?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-secondary/40 p-4 min-w-0" data-testid={testId}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
      {note && <p className="text-xs text-muted-foreground mt-1">{note}</p>}
    </div>
  );
}

function Meter({ pct, tone = "primary" }: { pct: number; tone?: "primary" | "warn" | "bad" }) {
  const color = tone === "bad" ? DANGER : tone === "warn" ? APIFY : OPENAI;
  return (
    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }} />
    </div>
  );
}

/** A ranked list: name, amount, a bar, then a caption. Rows with an id can be opened. */
function Ranked({ rows, caption, onOpen, value = (r: UsageRow) => money(r.cost) }: {
  rows: UsageRow[]; caption?: (r: UsageRow) => ReactNode; onOpen?: (id: number) => void; value?: (r: UsageRow) => string;
}) {
  if (!rows.length) return <Empty />;
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={`${r.id ?? ""}${r.name}`}>
          <div className="flex justify-between gap-3 text-sm">
            {onOpen && r.id ? (
              <button className="truncate text-left text-primary hover:underline" onClick={() => onOpen(r.id!)} title={r.name}>{r.name}</button>
            ) : <span className="truncate text-white" title={r.name}>{r.name}</span>}
            <strong className="shrink-0 text-white">{value(r)}</strong>
          </div>
          <Meter pct={r.pct} />
          {caption && <p className="text-xs text-muted-foreground mt-1">{caption(r)}</p>}
        </li>
      ))}
    </ul>
  );
}

function CallsTable({ rows }: { rows: UsageCall[] }) {
  if (!rows.length) return <Empty text="No calls yet." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-white/5">
              <td className="py-1.5 pr-3 whitespace-nowrap text-muted-foreground">{r.created_at}</td>
              <td className="py-1.5 pr-3 max-w-[260px] truncate text-white" title={r.context}>{r.context}</td>
              <td className="py-1.5 pr-3 whitespace-nowrap text-white">{money(r.cost)}</td>
              <td className="py-1.5 whitespace-nowrap text-muted-foreground">{((r.duration_ms ?? 0) / 1000).toFixed(1)}s</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type Tab = "cost" | "activity";
const TABS: { id: Tab; label: string }[] = [{ id: "cost", label: "Cost" }, { id: "activity", label: "User activity" }];

function Tabs({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  return (
    <div role="tablist" aria-label="Usage sections" className="flex gap-1 border-b border-white/10">
      {TABS.map((t) => (
        <button key={t.id} role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls={`panel-${t.id}`} onClick={() => onTab(t.id)}
          className={`-mb-px px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${tab === t.id ? "border-primary text-white" : "border-transparent text-muted-foreground hover:text-white"}`}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

function CostTab({ d, onUser }: { d: UsageSummary; onUser: (id: number) => void }) {
  const c = d.cards;
  return (
    <div role="tabpanel" id="panel-cost" aria-labelledby="tab-cost" className="space-y-6">
      {c.spike && (
        <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          Today's spend ({money(c.today)}) is over 3× the daily average of the previous 7 days ({money(c.prev7_avg)}). Check for a script stuck in a loop.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Today" value={money(c.today)} note="since midnight" testId="stat-today" />
        <Stat label="7 days" value={money(c.d7)} note="rolling" />
        <Stat label="30 days" value={money(c.d30)} note="rolling" />
        <Stat label="This month" value={money(c.month)} note={`projected ${money(c.projected)}`} />
      </div>

      <Panel title={`Spend per day (${d.days} days: ${money(d.window_total)})`}>
        <div className="h-64" data-testid="chart-daily">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={d.daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#ffffff14" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "#a1a1aa", fontSize: 11 }} interval="preserveStartEnd" minTickGap={24} />
              <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} tickFormatter={(v: number) => `$${v}`} width={48} />
              <Tooltip content={<ChartTip amount={(v) => money(v)} />} cursor={{ fill: "#ffffff10" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="llm" name="OpenAI" stackId="s" fill={OPENAI} />
              <Bar dataKey="apify" name="Apify" stackId="s" fill={APIFY} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Where the money goes (by feature)">
          {d.features.length ? (
            <div style={{ height: Math.max(160, d.features.length * 44) }} data-testid="chart-features">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.features} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={150} interval={0} tickLine={false} tick={{ fill: "#e4e4e7", fontSize: 12 }} />
                  <Tooltip content={<ChartTip amount={(v) => money(v)} extra={(row) => { const f = row.payload as { calls?: number; avg?: number } | undefined; return f?.calls ? `${f.calls} calls · average $${(f.avg ?? 0).toFixed(4)} per call` : null; }} />} cursor={{ fill: "#ffffff10" }} />
                  <Bar dataKey="cost" name="Cost" radius={[0, 4, 4, 0]}>
                    {d.features.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <Empty />}
        </Panel>

        <Panel title="Top 10 users by cost">
          <Ranked rows={d.users} onOpen={onUser}
            caption={(r) => { const u = r as typeof d.users[number]; return <>{u.calls} calls{u.split?.length ? " · " + u.split.map(([k, v]) => `${k} ${money(v)}`).join(" · ") : ""}</>; }} />
        </Panel>

        <Panel title="Model mix and cached tokens">
          <Ranked rows={d.models} caption={(r) => { const m = r as typeof d.models[number]; return `${m.calls} calls · ${m.cached_pct}% of prompt tokens cached`; }} />
        </Panel>

        <Panel title="Apify: dearest accounts">
          <Ranked rows={d.apify} caption={(r) => { const a = r as typeof d.apify[number]; return `${a.runs} run${a.runs === 1 ? "" : "s"}, ${a.got} of ${a.asked} results`; }} />
        </Panel>
      </div>
    </div>
  );
}

function FeatureUsePanel({ d, prefs, onPrefs }: { d: UsageSummary; prefs: FeaturePrefs; onPrefs: (p: FeaturePrefs) => void }) {
  const lines = FEATURE_LINES.filter((l) => d.feature_lines.includes(l.key));
  const shown = lines.filter((l) => prefs.lines.includes(l.key));
  const data = d.feature_daily.map((r) => ({ day: r.day, ...r[prefs.mode] }));
  const toggle = (key: string) => onPrefs({ ...prefs, lines: prefs.lines.includes(key) ? prefs.lines.filter((k) => k !== key) : [...prefs.lines, key] });
  const modes: { id: FeatureMode; label: string }[] = [{ id: "users", label: "By user" }, { id: "uses", label: "By feature uses" }];
  return (
    <Panel title="Feature use per day"
      action={
        <div className="flex gap-1" role="group" aria-label="Count by">
          {modes.map((m) => (
            <button key={m.id} onClick={() => onPrefs({ ...prefs, mode: m.id })} aria-pressed={prefs.mode === m.id}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border ${prefs.mode === m.id ? "bg-primary/15 text-primary border-primary/40" : "border-border text-muted-foreground hover:text-white"}`}>
              {m.label}
            </button>
          ))}
        </div>
      }>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4" role="group" aria-label="Lines to show" data-testid="feature-line-picker">
        {lines.map((l) => (
          <label key={l.key} className="flex items-center gap-2 text-xs text-white cursor-pointer select-none">
            <input type="checkbox" checked={prefs.lines.includes(l.key)} onChange={() => toggle(l.key)} className="h-3.5 w-3.5 accent-primary" />
            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} />{l.label}
          </label>
        ))}
        <span className="flex gap-3 text-xs">
          <button className="text-primary hover:underline" onClick={() => onPrefs({ ...prefs, lines: lines.map((l) => l.key) })}>All</button>
          <button className="text-primary hover:underline" onClick={() => onPrefs({ ...prefs, lines: [] })}>None</button>
        </span>
      </div>

      {shown.length ? (
        <div className="h-72" data-testid="chart-feature-use">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#ffffff14" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "#a1a1aa", fontSize: 11 }} interval="preserveStartEnd" minTickGap={24} />
              <YAxis allowDecimals={false} domain={[0, (max: number) => Math.max(max, 1)]} tick={{ fill: "#a1a1aa", fontSize: 11 }} width={32} />
              <Tooltip content={<ChartTip amount={(v) => String(v)} />} cursor={{ stroke: "#ffffff30" }} />
              {shown.map((l) => <Line key={l.key} type="monotone" dataKey={l.key} name={l.label} stroke={l.color} strokeWidth={2} dot={{ r: 2.5, fill: l.color }} activeDot={{ r: 5 }} />)}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : <Empty text="Tick at least one line to draw it." />}
      <p className="text-xs text-muted-foreground mt-2">
        {prefs.mode === "users"
          ? "By user: how many different users used each feature that day (up the side)."
          : "By feature uses: how many times each feature was used that day, which can be several per user."}
      </p>
    </Panel>
  );
}

function ActivityTab({ d, onUser, prefs, onPrefs }: { d: UsageSummary; onUser: (id: number) => void; prefs: FeaturePrefs; onPrefs: (p: FeaturePrefs) => void }) {
  const days = d.active_users;
  const today = days[days.length - 1];
  const peak = days.reduce((best, r) => (r.users > best.users ? r : best), days[0] ?? { day: "-", users: 0, actions: 0 });
  const opened = d.reveals.reduce((sum, r) => sum + Math.round(r.cost), 0);
  return (
    <div role="tabpanel" id="panel-activity" aria-labelledby="tab-activity" className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Active today" value={String(today?.users ?? 0)} note={`${today?.actions ?? 0} actions`} testId="stat-active-today" />
        <Stat label="Busiest day" value={String(peak?.users ?? 0)} note={`${peak?.day ?? "-"} (users)`} />
        <Stat label="Contacts opened" value={String(opened)} note={`last ${d.days} days`} />
        <Stat label="Accounts" value={String(d.funnel_extra.accounts)} note={`${d.funnel_extra.signups_window} new sign-ups in ${d.days} days`} />
      </div>

      <Panel title="Active users per day">
        <div className="h-64" data-testid="chart-active-users">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={d.active_users} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#ffffff14" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "#a1a1aa", fontSize: 11 }} interval="preserveStartEnd" minTickGap={24} />
              <YAxis allowDecimals={false} domain={[0, (max: number) => Math.max(max, 1)]} tick={{ fill: "#a1a1aa", fontSize: 11 }} width={32} />
              <Tooltip content={<ChartTip amount={(v) => String(v)} extra={(row) => { const a = (row.payload as { actions?: number } | undefined)?.actions; return a != null ? `${a} actions in total` : null; }} />} cursor={{ stroke: "#ffffff30" }} />
              <Line type="monotone" dataKey="users" name="Active users" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: "#10b981" }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted-foreground mt-2">A user counts once per day if they did anything that day: a paid AI call, a pitch, a saved brand, an Instagram post added or removed, a daily-limit feature or an opened contact.</p>
      </Panel>

      <FeatureUsePanel d={d} prefs={prefs} onPrefs={onPrefs} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Top 10 users by activity">
          <Ranked rows={d.activity_users.map((u) => ({ id: u.id, name: u.name, cost: u.count, pct: u.pct, split: u.split }))} onOpen={onUser}
            value={(r) => `${Math.round(r.cost)} actions`}
            caption={(r) => { const split = (r as { split?: [string, number][] }).split ?? []; return split.length ? <>Most used: {split[0][0]} · {split.map(([k, n]) => `${k} ${n}`).join(" · ")}</> : null; }} />
        </Panel>

        <Panel title="Brand contacts opened per user">
          <Ranked rows={d.reveals} value={(r) => String(Math.round(r.cost))} caption={(r) => { const b = r as typeof d.reveals[number]; return `${b.brands} brand${b.brands === 1 ? "" : "s"}`; }} />
        </Panel>

        <Panel title="Sign-up funnel">
          <ul className="space-y-3">
            {d.funnel.map((r) => (
              <li key={r.name}>
                <div className="flex justify-between gap-3 text-sm text-white"><span>{r.name}</span><strong>{r.n}</strong></div>
                <Meter pct={r.pct} />
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground mt-3">{d.funnel_extra.accounts} accounts in total · {d.funnel_extra.signups_window} new sign-ups in the last {d.days} days</p>
        </Panel>
      </div>
    </div>
  );
}

function Dashboard({ d, onUser, tab, onTab, prefs, onPrefs }: {
  d: UsageSummary; onUser: (id: number) => void; tab: Tab; onTab: (t: Tab) => void; prefs: FeaturePrefs; onPrefs: (p: FeaturePrefs) => void;
}) {
  return (
    <div className="space-y-6">
      <Tabs tab={tab} onTab={onTab} />
      {tab === "cost" ? <CostTab d={d} onUser={onUser} /> : <ActivityTab d={d} onUser={onUser} prefs={prefs} onPrefs={onPrefs} />}
    </div>
  );
}

const when = (iso: string) => {
  const t = new Date(iso);
  return Number.isNaN(t.getTime()) ? iso : t.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

/** One user, opened from the Cost tab (money) or from the User activity tab (what they did: no money anywhere). */
function UserDetail({ d, tab, onBack }: { d: UsageSummary; tab: Tab; onBack: () => void }) {
  const u = d.user!;
  const back = <button onClick={onBack} className="text-sm text-primary hover:underline">← Back to {tab === "cost" ? "cost" : "user activity"}</button>;
  if (tab === "cost") {
    return (
      <div className="space-y-6">
        {back}
        <Panel title={u.email}>
          <div className="grid gap-6 lg:grid-cols-2">
            <div><h3 className="text-xs text-muted-foreground mb-3">Cost by feature ({d.days} days)</h3><Ranked rows={u.features} caption={(r) => `${r.calls ?? 0} calls`} /></div>
            <div><h3 className="text-xs text-muted-foreground mb-3">Latest 20 calls</h3><CallsTable rows={u.recent} /></div>
          </div>
        </Panel>
      </div>
    );
  }
  const mix = u.activity_mix.map((m) => ({ name: m.name, cost: m.count, pct: m.pct }));   // Ranked draws "cost"; here it is a number of times
  return (
    <div className="space-y-6" data-testid="user-activity">
      {back}
      <Panel title={u.email}>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <Stat label="Most used feature" value={u.activity_mix[0]?.name ?? "No activity"} note={u.activity_mix[0] ? `${u.activity_mix[0].count} times in ${d.days} days` : `none in ${d.days} days`} testId="stat-most-used" />
          <Stat label="Activities" value={String(u.activity_mix.reduce((n, m) => n + m.count, 0))} note={`last ${d.days} days`} />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="text-xs text-muted-foreground mb-3">What they use ({d.days} days)</h3>
            <Ranked rows={mix} value={(r) => String(Math.round(r.cost))} />
          </div>
          <div>
            <h3 className="text-xs text-muted-foreground mb-3">Latest 20 activities</h3>
            {u.activity.length ? (
              <ol className="space-y-2.5 border-l border-white/10 pl-4" data-testid="activity-timeline">
                {u.activity.map((a, i) => (
                  <li key={`${a.at}${i}`} className="relative text-sm">
                    <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                    <p className="text-white">{a.what}</p>
                    <p className="text-xs text-muted-foreground">{when(a.at)} · {a.group}</p>
                  </li>
                ))}
              </ol>
            ) : <Empty text="No activity recorded yet." />}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-5">Shows what the user did (matching runs, pitches, saved brands, opened contacts, Instagram posts added or removed and so on), newest first. Pages they only looked at are not recorded.</p>
      </Panel>
    </div>
  );
}

export default function UsageCost() {
  const { user, logout } = useAuth();
  const [days, setDays] = useState<number>(30);
  const [userId, setUserId] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>("cost");
  const [featurePrefs, setFeaturePrefs] = useState<FeaturePrefs>({ mode: "users", lines: FEATURE_LINES.map((l) => l.key) });   // kept while you switch tabs or open a user
  const admin = isAdmin(user);
  const query = useQuery({
    queryKey: ["usage-summary", days, userId],
    queryFn: () => getUsageSummary(days, userId),
    enabled: admin,
    refetchInterval: 60_000,
    placeholderData: (previous) => previous,   // keep what is on screen while another window / user loads, so the page does not flash to a spinner
  });

  if (!admin) return <Redirect to="/dashboard" />;   // the server refuses non-admins as well; this just keeps them off an empty page

  const forbidden = query.error instanceof ApiRequestError && query.error.status === 403;
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* This page is separate from the creator app: no app navigation, no footer, just a label and Sign out. */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl" data-testid="admin-header">
        <div className="container mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <span className="font-bold tracking-tight text-white">MAVLIT <span className="ml-1 text-xs font-semibold text-primary">Admin</span></span>
          <button onClick={logout} title="Sign out" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors">
            <LogOut size={13} />Sign out
          </button>
        </div>
      </header>
      <main className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Usage &amp; Cost</h1>
              <p className="text-sm text-muted-foreground">What users spent on OpenAI and Apify, and what they did. Enrichment scripts and test accounts are not counted. Admins only.</p>
            </div>
            <div className="flex gap-2" role="group" aria-label="Time window">
              {USAGE_DAY_CHOICES.map((n) => (
                <button key={n} onClick={() => setDays(n)} aria-pressed={n === days}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${n === days ? "bg-primary/15 text-primary border-primary/40" : "border-border text-muted-foreground hover:text-white"}`}>
                  {n} days
                </button>
              ))}
            </div>
          </div>

          {query.isLoading && <div className="flex justify-center py-24"><Loader2 className="animate-spin text-primary" aria-label="Loading usage" /></div>}
          {query.isError && (
            <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {forbidden ? "You don't have access to this page." : "Could not load the usage numbers. Try again in a moment."}
            </div>
          )}
          {query.data && (query.data.user ? <UserDetail d={query.data} tab={tab} onBack={() => setUserId(null)} /> : <Dashboard d={query.data} onUser={setUserId} tab={tab} onTab={setTab} prefs={featurePrefs} onPrefs={setFeaturePrefs} />)}
        </div>
      </main>
    </div>
  );
}
