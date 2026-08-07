export function ExecStage({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-exec-border bg-exec-bg p-4 sm:p-6">{children}</div>;
}

export function ExecCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-lg border border-exec-border border-t-4 border-t-brand-500 bg-exec-panel p-5 ${className}`}
    >
      {children}
    </div>
  );
}

export function ExecSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-brand-600">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-exec-muted">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function ExecStatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <ExecCard>
      <p className="text-xs font-medium uppercase tracking-wide text-exec-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-exec-text">{value}</p>
      {hint && <p className="mt-1 text-xs text-exec-muted">{hint}</p>}
    </ExecCard>
  );
}

const SEVERITY_STYLES = {
  high: "border-brand-300 bg-brand-50 text-brand-700",
  medium: "border-amber-300 bg-amber-50 text-amber-700",
} as const;

export function ExecBadge({ severity, text }: { severity: "high" | "medium"; text: string }) {
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${SEVERITY_STYLES[severity]}`}>
      {text}
    </span>
  );
}
