"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { AdminOverviewMonthPoint } from "@/app/actions/analytics";
import { ChartCard } from "@/components/charts/chart-card";
import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { formatCount, monthLong, monthShort } from "@/components/charts/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const SERIES_COLOR = "var(--chart-1)";

interface EnrollmentsChartProps {
  data: Array<AdminOverviewMonthPoint>;
  isEmpty?: boolean;
  subtitle?: string;
  className?: string;
}

/** Headroom above the tallest point so the end label never clips. */
function yDomain(dataMax: number): number {
  if (!Number.isFinite(dataMax)) return 4;
  return Math.max(4, Math.ceil(dataMax * 1.18));
}

type RechartsTooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: unknown }>;
  label?: unknown;
};

function EnrollmentsTooltip({ active, payload, label }: RechartsTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const point = payload[0]?.payload as AdminOverviewMonthPoint | undefined;
  if (!point) return null;

  return (
    <ChartTooltip
      label={monthLong(typeof label === "string" ? label : point.date)}
      rows={[{ color: SERIES_COLOR, value: formatCount(point.value), label: "new enrollments" }]}
    />
  );
}

function EnrollmentsTable({ data }: { data: Array<AdminOverviewMonthPoint> }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="h-8 px-2 text-xs">Month</TableHead>
          <TableHead className="h-8 px-2 text-right text-xs">New enrollments</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((point) => (
          <TableRow key={point.date}>
            <TableCell className="px-2 py-1.5 text-xs whitespace-normal">
              {monthLong(point.date)}
            </TableCell>
            <TableCell className="px-2 py-1.5 text-right text-xs tabular-nums">
              {formatCount(point.value)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * Change-over-time chart for new enrollments: single-series line (2px, round
 * caps) with a ≤10% area wash, crosshair + tooltip hover layer, horizontal-only
 * recessive gridlines and one selective direct label — the latest value.
 */
function EnrollmentsChart({ data, isEmpty = false, subtitle, className }: EnrollmentsChartProps) {
  const latest = data.length > 0 ? data[data.length - 1] : undefined;
  const resolvedSubtitle =
    subtitle ?? (latest ? `${formatCount(latest.value)} in ${monthLong(latest.date)}` : undefined);

  return (
    <ChartCard
      title="New enrollments"
      subtitle={resolvedSubtitle}
      table={<EnrollmentsTable data={data} />}
      isEmpty={isEmpty}
      emptyTitle="No enrollments yet"
      emptyDescription="New enrollments will plot here once students join courses."
      className={className}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 16, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />

          <XAxis
            dataKey="date"
            tickFormatter={monthShort}
            interval="equidistantPreserveStart"
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />

          <YAxis
            allowDecimals={false}
            domain={[0, yDomain]}
            width={38}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />

          <Tooltip
            cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
            content={EnrollmentsTooltip}
          />

          <Area
            type="monotone"
            dataKey="value"
            name="New enrollments"
            stroke={SERIES_COLOR}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={SERIES_COLOR}
            fillOpacity={0.08}
            dot={false}
            activeDot={{
              r: 4,
              fill: SERIES_COLOR,
              stroke: "var(--card)",
              strokeWidth: 2,
            }}
          />

          {latest ? (
            <ReferenceDot
              x={latest.date}
              y={latest.value}
              r={4}
              fill={SERIES_COLOR}
              stroke="var(--card)"
              strokeWidth={2}
              label={{
                value: formatCount(latest.value),
                position: "top",
                offset: 10,
                fill: "var(--foreground)",
                fontSize: 11,
                fontWeight: 500,
              }}
            />
          ) : null}
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export { EnrollmentsChart };
export type { EnrollmentsChartProps };
