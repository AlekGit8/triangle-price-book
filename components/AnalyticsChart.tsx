"use client";

import { useState } from "react";

export interface ChartBucket {
  key: string;
  label: string;
  human: number;
  bots: number;
  views: number;
}

function niceCeiling(max: number): number {
  if (max <= 0) return 1;
  if (max <= 5) return 5;
  if (max <= 10) return 10;
  if (max <= 25) return 25;
  if (max <= 50) return 50;
  if (max <= 100) return 100;
  if (max <= 250) return 250;
  if (max <= 500) return 500;
  return Math.ceil(max / 1000) * 1000;
}

/**
 * Grouped bar chart (SVG, no chart library): one pair of bars per
 * bucket — black for human visitors, light grey for bots. Hovering a
 * bucket shows its numbers in the line below the chart.
 */
export default function AnalyticsChart({ buckets }: { buckets: ChartBucket[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const maxValue = Math.max(0, ...buckets.map((b) => Math.max(b.human, b.bots)));
  const ceiling = niceCeiling(maxValue);
  const totalHuman = buckets.reduce((a, b) => a + b.human, 0);
  const totalBots = buckets.reduce((a, b) => a + b.bots, 0);

  const W = 720;
  const H = 240;
  const PAD_LEFT = 36;
  const PAD_BOTTOM = 28;
  const PAD_TOP = 12;
  const chartW = W - PAD_LEFT - 8;
  const chartH = H - PAD_TOP - PAD_BOTTOM;

  if (buckets.length === 0 || maxValue === 0) {
    return (
      <div className="rounded-2xl border border-line bg-white p-5">
        <p className="text-muted">No visits in this range yet.</p>
      </div>
    );
  }

  const groupW = chartW / buckets.length;
  const barW = Math.max(2, Math.min(18, (groupW - 6) / 2));
  const y = (v: number) => PAD_TOP + chartH - (v / ceiling) * chartH;
  const labelEvery = Math.max(1, Math.ceil(buckets.length / 12));
  const hovered = hover !== null ? buckets[hover] : null;

  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-black" /> Human visitors
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-line" /> Bots
        </span>
        <span className="ml-auto font-mono text-xs text-muted">
          {hovered
            ? `${hovered.label} — ${hovered.human + hovered.bots} visitors (${hovered.human} human, ${hovered.bots} bots), ${hovered.views} page views`
            : `${totalHuman + totalBots} visitors in range (${totalHuman} human, ${totalBots} bots)`}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-4 w-full"
        role="img"
        aria-label="Visitors over time, humans vs bots"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line
              x1={PAD_LEFT}
              x2={W - 8}
              y1={PAD_TOP + chartH - f * chartH}
              y2={PAD_TOP + chartH - f * chartH}
              style={{ stroke: "rgb(var(--chart-grid))" }}
              strokeWidth={1}
            />
            <text
              x={PAD_LEFT - 6}
              y={PAD_TOP + chartH - f * chartH + 4}
              textAnchor="end"
              fontSize={11}
              style={{ fill: "rgb(var(--chart-label))" }}
              fontFamily="monospace"
            >
              {Math.round(ceiling * f)}
            </text>
          </g>
        ))}
        {buckets.map((b, i) => {
          const gx = PAD_LEFT + i * groupW;
          const cx = gx + groupW / 2;
          return (
            <g
              key={b.key}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              opacity={hover === null || hover === i ? 1 : 0.45}
            >
              <rect
                x={cx - barW - 1}
                y={y(b.human)}
                width={barW}
                height={Math.max(0, PAD_TOP + chartH - y(b.human))}
                style={{ fill: "rgb(var(--chart-human))" }}
                rx={2}
              />
              <rect
                x={cx + 1}
                y={y(b.bots)}
                width={barW}
                height={Math.max(0, PAD_TOP + chartH - y(b.bots))}
                style={{ fill: "rgb(var(--chart-bot))" }}
                rx={2}
              />
              {i % labelEvery === 0 && (
                <text
                  x={cx}
                  y={H - 8}
                  textAnchor="middle"
                  fontSize={11}
                  style={{ fill: "rgb(var(--chart-label))" }}
                >
                  {b.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
