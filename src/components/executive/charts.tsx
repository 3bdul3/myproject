import type { MonthlyRevenuePoint } from "@/lib/actions/accounting";
import type { CashProjectionPoint } from "@/lib/actions/executive";

const WIDTH = 600;
const HEIGHT = 200;
const PAD = { top: 16, right: 16, bottom: 28, left: 16 };

function fmtCompact(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

export function RevenueTrendChart({ points }: { points: MonthlyRevenuePoint[] }) {
  if (points.length === 0) return null;

  const maxValue = Math.max(...points.map((p) => Math.max(p.invoicedTotal, p.cashCollected)), 1);
  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const slot = innerW / points.length;
  const barW = Math.min(28, slot * 0.32);

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Revenue trend by month">
      {points.map((p, i) => {
        const cx = PAD.left + slot * i + slot / 2;
        const invoicedH = (p.invoicedTotal / maxValue) * innerH;
        const collectedH = (p.cashCollected / maxValue) * innerH;
        return (
          <g key={p.month}>
            <rect
              x={cx - barW - 2}
              y={PAD.top + innerH - invoicedH}
              width={barW}
              height={invoicedH}
              rx={2}
              className="fill-brand-500"
            />
            <rect
              x={cx + 2}
              y={PAD.top + innerH - collectedH}
              width={barW}
              height={collectedH}
              rx={2}
              className="fill-exec-border"
            />
            <text x={cx} y={HEIGHT - 8} textAnchor="middle" className="fill-exec-muted text-[10px]">
              {p.month}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function CashProjectionChart({ points, startingCash }: { points: CashProjectionPoint[]; startingCash: number }) {
  if (points.length === 0) return null;

  const values = [startingCash, ...points.map((p) => p.cumulativeNetCash)];
  const maxValue = Math.max(...values, 0);
  const minValue = Math.min(...values, 0);
  const range = maxValue - minValue || 1;
  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;

  const yFor = (v: number) => PAD.top + innerH - ((v - minValue) / range) * innerH;
  const xFor = (i: number) => PAD.left + (i / points.length) * innerW;
  const zeroY = yFor(0);

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i + 1).toFixed(1)} ${yFor(p.cumulativeNetCash).toFixed(1)}`)
    .join(" ");
  const areaPath = `M ${xFor(0)} ${yFor(startingCash)} ${linePath} L ${xFor(points.length)} ${zeroY} L ${xFor(0)} ${zeroY} Z`;

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Projected cash position">
      <line x1={PAD.left} y1={zeroY} x2={WIDTH - PAD.right} y2={zeroY} className="stroke-exec-border" strokeWidth={1} strokeDasharray="4 3" />
      <path d={areaPath} className="fill-brand-100" />
      <path d={`M ${xFor(0)} ${yFor(startingCash)} ${linePath}`} className="stroke-brand-600" strokeWidth={2} fill="none" />
      {points.map((p, i) => (
        <circle key={p.date} cx={xFor(i + 1)} cy={yFor(p.cumulativeNetCash)} r={2.5} className="fill-brand-600" />
      ))}
      <text x={PAD.left} y={HEIGHT - 8} className="fill-exec-muted text-[10px]">
        {points[0]?.date}
      </text>
      <text x={WIDTH - PAD.right} y={HEIGHT - 8} textAnchor="end" className="fill-exec-muted text-[10px]">
        {points[points.length - 1]?.date}
      </text>
      <text x={WIDTH - PAD.right} y={zeroY - 4} textAnchor="end" className="fill-exec-muted text-[10px]">
        {fmtCompact(0)}
      </text>
    </svg>
  );
}
