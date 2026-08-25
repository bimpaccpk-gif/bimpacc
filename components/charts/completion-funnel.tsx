"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { AdminOverviewFunnelStep } from "@/app/actions/analytics";
import { ChartCard } from "@/components/charts/chart-card";
import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { formatCount, formatPercent } from "@/components/charts/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Ordinal lightness ramp for the funnel's ordered stages — one hue, light to
 * dark, derived from --chart-1 via color-mix so it tracks the token in both
 * modes. Never a pie, never a rainbow: order carries meaning here.
 *
 * Weights validated against the dataviz palette checker in BOTH modes
 * (monotone lightness, adjacent ΔL ≥ 0.06, light end ≥ 2:1 vs card): 100 /
 * 78 / 56 is the widest spread that still clears the contrast floor — deeper
 * mixes fade into the card surface in dark mode and wash out past ~2:1 in
 * light mode.
 */
const FUNNEL_RAMP = [
  "color-mix(in oklab, var(--chart-1) 100%, var(--card))",
  "color-mix(in oklab, var(--chart-1) 78%, var(--card))",
  "color-mix(in oklab, var(--chart-1) 56%, var(--card))",
];

interface CompletionFunnelProps {
  data: Array<AdminOverviewFunnelStep>;
  isEmpty?: boolean;
  subtitle?: string;
  className?: string;
}

type RechartsTooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: unknown }>;
};

/** Rounds to 1 decimal without float dust (62.5 -> 62.5, 66.666 -> 66.7). */
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function FunnelTooltip({
  active,
  payload,
  data,
}: RechartsTooltipProps & { data: Array<AdminOverviewFunnelStep> }) {
  if (!active || !payload || payload.length === 0) return null;

  const step = payload[0]?.payload as AdminOverviewFunnelStep | undefined;
  if (!step) return null;

  const stepIndex = data.findIndex((entry) => entry.label === step.label);
  const enrolled = data[0]?.value ?? 0;
  const share = enrolled > 0 ? formatPercent(round1((step.value / enrolled) * 100)) : undefined;

  return (
    <ChartTooltip
      label={step.label}
      rows={[
        {
          color: FUNNEL_RAMP[(stepIndex >= 0 ? stepIndex : 0) % FUNNEL_RAMP.length],
          value: formatCount(step.value),
          label: share ? `students · ${share} of enrolled` : "students",
          hint: step.description,
        },
      ]}
    />
  );
}

function FunnelTable({ data }: { data: Array<AdminOverviewFunnelStep> }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="h-8 px-2 text-xs">Stage</TableHead>
          <TableHead className="h-8 px-2 text-right text-xs">Students</TableHead>
          <TableHead className="h-8 px-2 text-xs">Definition</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((step) => (
          <TableRow key={step.label}>
            <TableCell className="px-2 py-1.5 text-xs font-medium">{step.label}</TableCell>
            <TableCell className="px-2 py-1.5 text-right text-xs tabular-nums">
              {formatCount(step.value)}
            </TableCell>
            <TableCell className="px-2 py-1.5 text-muted-foreground text-xs whitespace-normal">
              {step.description}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * Horizontal funnel bars (layout="vertical") on the ordinal lightness ramp:
 * square at the baseline edge, rounded at the data end, values labelled at the
 * tip and each stage defined in its tooltip. No gridlines — three labelled
 * marks carry themselves.
 */
function CompletionFunnel({ data, isEmpty = false, subtitle, className }: CompletionFunnelProps) {
  const enrolled = data[0]?.value ?? 0;
  const completed = data[data.length - 1]?.value ?? 0;
  const resolvedSubtitle =
    subtitle ??
    (enrolled > 0
      ? `${formatPercent(round1((completed / enrolled) * 100))} of enrollments reach completion`
      : "Enrolled → Started → Completed");

  return (
    <ChartCard
      title="Completion funnel"
      subtitle={resolvedSubtitle}
      table={<FunnelTable data={data} />}
      isEmpty={isEmpty}
      emptyTitle="No enrollments yet"
      emptyDescription="The funnel fills in as students enroll and make progress."
      className={className}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={data} margin={{ top: 4, right: 56, bottom: 4, left: 8 }}>
          <XAxis
            type="number"
            hide
            domain={[0, (dataMax: number) => Math.max(1, Math.ceil(dataMax * 1.15))]}
          />

          <YAxis
            type="category"
            dataKey="label"
            width={88}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />

          <Tooltip cursor={false} content={(props) => <FunnelTooltip {...props} data={data} />} />

          <Bar
            dataKey="value"
            name="Students"
            barSize={20}
            radius={[0, 4, 4, 0]}
            activeBar={{ fillOpacity: 0.85 }}
          >
            {data.map((step, index) => (
              <Cell key={step.label} fill={FUNNEL_RAMP[index % FUNNEL_RAMP.length]} />
            ))}

            <LabelList
              dataKey="value"
              position="right"
              formatter={(value: unknown) => formatCount(Number(value))}
              fill="var(--foreground)"
              fontSize={11}
              fontWeight={500}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export { CompletionFunnel };
export type { CompletionFunnelProps };
