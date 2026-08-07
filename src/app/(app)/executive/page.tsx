import Link from "next/link";
import { requireRole } from "@/lib/authz";
import { getFinancialSummary, getArSummary, getRevenueTrend } from "@/lib/actions/accounting";
import { getApSummary } from "@/lib/actions/ap";
import { getCashPositionProjection, getAttentionItems } from "@/lib/actions/executive";
import { PageHeader } from "@/components/ui";
import { ExecStage, ExecCard, ExecSection, ExecStatCard, ExecBadge } from "@/components/executive/ui";
import { RevenueTrendChart, CashProjectionChart } from "@/components/executive/charts";

const HORIZONS = [30, 45, 60] as const;

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function ExecutiveDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ horizon?: string }>;
}) {
  await requireRole(["admin"]);

  const { horizon } = await searchParams;
  const horizonDays = (HORIZONS as readonly number[]).includes(Number(horizon))
    ? (Number(horizon) as 30 | 45 | 60)
    : 30;

  const [summary, ar, ap, trend, projection, attention] = await Promise.all([
    getFinancialSummary(),
    getArSummary(),
    getApSummary(),
    getRevenueTrend(),
    getCashPositionProjection(horizonDays),
    getAttentionItems(),
  ]);

  const cash = summary.accounts.find((a) => a.code === "1000")?.balance ?? 0;

  return (
    <div>
      <PageHeader
        title="Executive Dashboard"
        subtitle={`Company-wide financial position, as of ${projection.asOf}. Admin-only.`}
        breadcrumb={[{ label: "Home", href: "/dashboard" }, { label: "Executive" }]}
      />

      <ExecStage>
        <ExecSection title="Key figures">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ExecStatCard label="Net Income" value={fmt(summary.netIncome)} hint={summary.netIncome >= 0 ? "Profit" : "Loss"} />
            <ExecStatCard label="Cash on Hand" value={fmt(cash)} />
            <ExecStatCard label="Accounts Receivable" value={fmt(ar.arBalance)} hint="Owed by customers" />
            <ExecStatCard label="Accounts Payable" value={fmt(ap.apTradeBalance)} hint="Owed to suppliers" />
          </div>
        </ExecSection>

        <ExecSection title="Revenue trend" subtitle="Invoiced vs. cash collected, by month">
          <ExecCard>
            {trend.length < 2 && (
              <p className="mb-4 text-sm text-exec-muted">
                Showing {trend.length} month{trend.length === 1 ? "" : "s"} of data — the trend builds as more
                invoices post over time.
              </p>
            )}
            <RevenueTrendChart points={trend} />
            <div className="mt-3 flex gap-4 text-xs text-exec-muted">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-brand-500" /> Invoiced
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-exec-border" /> Cash collected
              </span>
            </div>
          </ExecCard>
        </ExecSection>

        <ExecSection title="Cash position projection" subtitle="Based on known invoice and bill due dates — not a statistical forecast">
          <ExecCard>
            <div className="mb-4 flex items-center gap-2">
              <label className="text-xs text-exec-muted">Horizon</label>
              {HORIZONS.map((h) => (
                <Link
                  key={h}
                  href={`/executive?horizon=${h}`}
                  className={`rounded-lg border px-3 py-1 text-xs font-medium ${
                    h === horizonDays
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-exec-border text-exec-muted hover:bg-exec-bg"
                  }`}
                >
                  {h} days
                </Link>
              ))}
            </div>
            {projection.points.length === 0 ? (
              <p className="text-sm text-exec-muted">No AR/AP due dates or recurring payroll fall within this horizon.</p>
            ) : (
              <CashProjectionChart points={projection.points} startingCash={projection.startingCash} />
            )}
            <div className="mt-3 grid grid-cols-2 gap-4 text-xs text-exec-muted sm:grid-cols-4">
              <span>Starting cash: {fmt(projection.startingCash)}</span>
              <span>Expected inflow: {fmt(projection.totals.arInflow)}</span>
              <span>Expected outflow: {fmt(projection.totals.apOutflow + projection.totals.payrollOutflow)}</span>
              <span>Projected cash: {fmt(projection.totals.projectedCash)}</span>
            </div>
            <p className="mt-3 text-xs text-exec-muted">
              Payroll outflow is estimated at each month-end from active employee salaries — there is no scheduled
              pay-date field yet, so treat it as an approximation.
            </p>
          </ExecCard>
        </ExecSection>

        <ExecSection title="Attention needed" subtitle={`${attention.length} item${attention.length === 1 ? "" : "s"}`}>
          {attention.length === 0 ? (
            <ExecCard>
              <p className="text-sm text-exec-muted">Nothing needs attention right now.</p>
            </ExecCard>
          ) : (
            <div className="space-y-2">
              {attention.map((item, i) => (
                <Link
                  key={i}
                  href={item.href}
                  className="flex items-center justify-between rounded-xl border border-exec-border border-t-4 border-t-brand-500 bg-exec-panel p-4 transition hover:bg-white"
                >
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <ExecBadge severity={item.severity} text={item.severity === "high" ? "Urgent" : "Upcoming"} />
                      <span className="text-sm font-medium text-exec-text">{item.title}</span>
                    </div>
                    <p className="text-xs text-exec-muted">{item.detail}</p>
                  </div>
                  {item.amount !== undefined && (
                    <span className="font-mono text-sm text-exec-text">{fmt(item.amount)}</span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </ExecSection>

        <ExecCard className="text-sm text-exec-muted">
          AI-generated narrative and automated anomaly detection are planned for a later phase — everything above is
          computed directly from your real accounting, sales, and inventory data.
        </ExecCard>
      </ExecStage>
    </div>
  );
}
