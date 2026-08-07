import Link from "next/link";

export function Breadcrumb({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav className="mb-2 flex items-center gap-1.5 text-xs text-stone-500">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-stone-300">/</span>}
          {item.href ? (
            <Link href={item.href} className="hover:text-brand-600 hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className="text-stone-700">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
  breadcrumb,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  breadcrumb?: Array<{ label: string; href?: string }>;
}) {
  return (
    <div className="mb-6 flex items-start justify-between border-b border-stone-200 pb-5">
      <div>
        {breadcrumb && <Breadcrumb items={breadcrumb} />}
        <h1 className="text-2xl font-semibold text-stone-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-stone-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-stone-200 bg-white p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  step,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number;
  required?: boolean;
  step?: string;
  placeholder?: string;
}) {
  const isDate = type === "date";

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-stone-600">{label}</label>
      <input
        name={name}
        type={isDate ? "text" : type}
        step={step}
        defaultValue={defaultValue}
        required={required}
        placeholder={isDate ? "YYYY-MM-DD" : placeholder}
        pattern={isDate ? "\\d{4}-\\d{2}-\\d{2}" : undefined}
        className="w-full rounded-lg border border-stone-300 px-3 py-1.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
    </div>
  );
}

export function Select({
  label,
  name,
  defaultValue,
  options,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: Array<{ value: string; label: string }>;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-stone-600">{label}</label>
      <select
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function SubmitButton({ label }: { label: string }) {
  return (
    <button
      type="submit"
      className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
    >
      {label}
    </button>
  );
}

export function Badge({ text, tone = "slate" }: { text: string; tone?: "slate" | "green" | "amber" | "red" | "indigo" }) {
  const tones: Record<string, string> = {
    slate: "bg-stone-100 text-stone-600",
    green: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
    indigo: "bg-brand-100 text-brand-700",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${tones[tone]}`}>
      {text}
    </span>
  );
}

const infotileTones: Record<string, string> = {
  slate: "bg-stone-100 text-stone-600",
  green: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700",
  indigo: "bg-brand-100 text-brand-700",
};

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "slate",
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: string;
  tone?: "slate" | "green" | "amber" | "red" | "indigo";
}) {
  return (
    <Card className="flex items-start gap-3">
      {icon && (
        <span
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-lg ${infotileTones[tone]}`}
        >
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase leading-snug tracking-wide text-stone-400">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-stone-900">{value}</p>
        {hint && <p className="mt-1 text-xs text-stone-400">{hint}</p>}
      </div>
    </Card>
  );
}
