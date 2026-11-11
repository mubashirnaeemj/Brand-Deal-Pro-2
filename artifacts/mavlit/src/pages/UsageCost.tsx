import { useState, type ReactNode } from "react";
import { Redirect } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { isAdmin, useAuth } from "@/contexts/AuthContext";
import { ApiRequestError } from "@/lib/api";
import { USAGE_DAY_CHOICES, getUsageSummary, money, type UsageCall, type UsageRow, type UsageSummary } from "@/lib/usage";

const OPENAI = "#7c3aed";
const APIFY = "#f59e0b";
const BUDGET = "#ef4444";
const PALETTE = ["#7c3aed", "#0ea5e9", "#10b981", "#f59e0b", "#ec4899", "#14b8a6", "#8b5cf6", "#ef4444"];
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
  const color = tone === "bad" ? BUDGET : tone === "warn" ? APIFY : OPENAI;
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

function Dashboard({ d, onUser }: { d: UsageSummary; onUser: (id: number) => void }) {
  const c = d.cards;
  const budgetTone = c.budget_pct >= 100 ? "bad" : c.projected_pct >= 100 ? "warn" : "primary";
  return (
    <div className="space-y-6">
      {c.spike && (
        <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          Today's spend ({money(c.today)}) is over 3× the daily average of the previous 7 days ({money(c.prev7_avg)}). Check for a script stuck in a loop.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Stat label="Today" value={money(c.today)} note="since midnight" testId="stat-today" />
        <Stat label="7 days" value={money(c.d7)} note="rolling" />
        <Stat label="30 days" value={money(c.d30)} note="rolling" />
        <Stat label="This month" value={money(c.month)} note={`projected ${money(c.projected)}`} />
        <div className="rounded-2xl border border-border bg-secondary/40 p-4 col-span-2 lg:col-span-1" data-testid="stat-budget">
          <p className="text-xs text-muted-foreground">Monthly budget</p>
          {c.budget ? (
            <>
              <p className="text-2xl font-bold text-white mt-1">{c.budget_pct}%</p>
              <div className="my-1.5"><Meter pct={c.budget_pct} tone={budgetTone} /></div>
              <p className="text-xs text-muted-foreground">{money(c.month)} of {money(c.budget)}; on pace for {c.projected_pct}%</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-white mt-1">not set</p>
              <p className="text-xs text-muted-foreground mt-1">set USAGE_MONTHLY_BUDGET_USD on the server</p>
            </>
          )}
        </div>
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
              {d.daily_budget > 0 && <ReferenceLine y={d.daily_budget} stroke={BUDGET} strokeDasharray="5 4" label={{ value: "daily budget", fill: BUDGET, fontSize: 11, position: "insideTopRight" }} />}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

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
        <p className="text-xs text-muted-foreground mt-2">A user counts once per day if they did anything that day: a paid AI call, a pitch, a saved brand, a daily-limit feature or an opened contact.</p>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Enrichment scripts vs users">
          <div className="h-3 rounded-full overflow-hidden flex bg-white/10" data-testid="split-bar">
            <div style={{ width: `${d.split.scripts_pct}%`, background: APIFY }} />
            <div style={{ width: `${d.split.users_pct}%`, background: OPENAI }} />
          </div>
          <div className="flex justify-between text-sm mt-3 gap-3">
            <span className="text-white"><span className="inline-block w-2.5 h-2.5 rounded-sm mr-1.5" style={{ background: APIFY }} />Scripts {money(d.split.scripts)} ({d.split.scripts_pct}%)</span>
            <span className="text-white"><span className="inline-block w-2.5 h-2.5 rounded-sm mr-1.5" style={{ background: OPENAI }} />Users {money(d.split.users)} ({d.split.users_pct}%)</span>
          </div>
        </Panel>

        <Panel title="By feature (users)">
          {d.features.length ? (
            <>
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
            </>
          ) : <Empty />}
        </Panel>

        <Panel title="Top 10 users">
          <Ranked rows={d.users} onOpen={onUser}
            caption={(r) => { const u = r as typeof d.users[number]; return <>{u.calls} calls{u.split?.length ? " · " + u.split.map(([k, v]) => `${k} ${money(v)}`).join(" · ") : ""}</>; }} />
        </Panel>

        <Panel title="Model mix and cached tokens">
          <Ranked rows={d.models} caption={(r) => { const m = r as typeof d.models[number]; return `${m.calls} calls · ${m.cached_pct}% of prompt tokens cached`; }} />
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Most expensive calls"><CallsTable rows={d.expensive} /></Panel>
        <Panel title="Slowest calls"><CallsTable rows={d.slow} /></Panel>
        <Panel title="Apify: dearest accounts">
          <Ranked rows={d.apify} caption={(r) => { const a = r as typeof d.apify[number]; return `${a.runs} run${a.runs === 1 ? "" : "s"}, ${a.got} of ${a.asked} results`; }} />
        </Panel>
      </div>

      <h2 className="text-lg font-bold text-white pt-2">Limits</h2>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Users near a daily limit (today)">
          {d.near_cap.length ? (
            <ul className="space-y-3">
              {d.near_cap.map((r) => (
                <li key={`${r.id}${r.feature}`}>
                  <div className="flex justify-between gap-3 text-sm">
                    <button className="truncate text-left text-primary hover:underline" onClick={() => onUser(r.id)}>{r.name} · {r.feature}</button>
                    <strong className="shrink-0 text-white">{r.uses} / {r.cap}</strong>
                  </div>
                  <Meter pct={r.pct} tone={r.pct >= 100 ? "bad" : "warn"} />
                </li>
              ))}
            </ul>
          ) : <Empty text="Nobody is near a limit." />}
        </Panel>
        <Panel title="Brand contacts opened per user">
          <Ranked rows={d.reveals} value={(r) => String(Math.round(r.cost))} caption={(r) => { const b = r as typeof d.reveals[number]; return `${b.brands} brand${b.brands === 1 ? "" : "s"}`; }} />
        </Panel>
      </div>

      <h2 className="text-lg font-bold text-white pt-2">Health</h2>
      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Jobs">
          <p className="text-sm mb-3" data-testid="health-jobs">
            {d.health.failed_total ? <strong className="text-red-400">{d.health.failed_total} failed</strong> : <strong className="text-emerald-400">No failed jobs</strong>}
            {" · "}
            {d.health.stuck.length ? <strong className="text-red-400">{d.health.stuck.length} stuck</strong> : <strong className="text-emerald-400">none stuck</strong>}
          </p>
          <ul className="space-y-1 text-sm">
            {Object.entries(d.health.failed).filter(([, n]) => n > 0).map(([k, n]) => <li key={k} className="flex justify-between text-white"><span>{k}</span><strong>{n}</strong></li>)}
            {d.health.stuck.map((s, i) => <li key={i} className="flex justify-between text-red-300"><span>{s.name} · {s.feature}</span><strong>since {s.since}</strong></li>)}
          </ul>
        </Panel>
        <Panel title="Failed sign-ins by address">
          {d.failed_signins.length ? (
            <table className="w-full text-xs">
              <thead><tr className="text-left text-muted-foreground"><th className="pb-1 font-medium">IP</th><th className="pb-1 font-medium">Failures</th><th className="pb-1 font-medium">Emails</th><th className="pb-1 font-medium">Last</th></tr></thead>
              <tbody>{d.failed_signins.map((r) => <tr key={r.name} className="border-t border-white/5 text-white"><td className="py-1.5">{r.name}</td><td>{r.n}</td><td>{r.emails}</td><td>{r.last}</td></tr>)}</tbody>
            </table>
          ) : <Empty text="None in this window." />}
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

function UserDetail({ d, onBack }: { d: UsageSummary; onBack: () => void }) {
  const u = d.user!;
  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-sm text-primary hover:underline">← Back to all users</button>
      <Panel title={u.email}>
        <div className="grid gap-6 lg:grid-cols-2">
          <div><h3 className="text-xs text-muted-foreground mb-3">Cost by feature ({d.days} days)</h3><Ranked rows={u.features} caption={(r) => `${r.calls ?? 0} calls`} /></div>
          <div><h3 className="text-xs text-muted-foreground mb-3">Latest 20 calls</h3><CallsTable rows={u.recent} /></div>
        </div>
      </Panel>
    </div>
  );
}

export default function UsageCost() {
  const { user } = useAuth();
  const [days, setDays] = useState<number>(30);
  const [userId, setUserId] = useState<number | null>(null);
  const admin = isAdmin(user);
  const query = useQuery({
    queryKey: ["usage-summary", days, userId],
    queryFn: () => getUsageSummary(days, userId),
    enabled: admin,
    refetchInterval: 60_000,
  });

  if (!admin) return <Redirect to="/dashboard" />;   // the server refuses non-admins as well; this just keeps them off an empty page

  const forbidden = query.error instanceof ApiRequestError && query.error.status === 403;
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />
      <main className="pt-28 pb-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Usage &amp; Cost</h1>
              <p className="text-sm text-muted-foreground">OpenAI and Apify spend, limits and health. Admins only.</p>
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
          {query.data && (query.data.user ? <UserDetail d={query.data} onBack={() => setUserId(null)} /> : <Dashboard d={query.data} onUser={setUserId} />)}
        </div>
      </main>
      <Footer />
    </div>
  );
}
