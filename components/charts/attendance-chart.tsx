"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { AdminOverviewAttendancePoint } from "@/app/actions/analytics";
import { ChartCard } from "@/components/charts/chart-card";
import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { formatPercent, monthLong, monthShort } from "@/components/charts/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const SERIES_COLOR = "var(--chart-2)";

/** Institution attendance target — the reference line every bar is read against. */
const ATTENDANCE_TARGET = 85;

interface AttendanceChartProps {
  data: Array<AdminOverviewAttendancePoint>;
  /** Reference line value, 0-100. */
  target?: number;
  isEmpty?: boolean;
  subtitle?: string;
  className?: string;
}

type RechartsTooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: unknown }>;
  label?: unknown;
};

function AttendanceTooltip({ active, payload, label }: RechartsTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const point = payload[0]?.payload as AdminOverviewAttendancePoint | undefined;
  if (!point) return null;

  return (
    <ChartTooltip
      label={monthLong(typeof label === "string" ? label : point.date)}
      rows={[{ color: SERIES_COLOR, value: formatPercent(point.rate), label: "attendance" }]}
    />
  );
}

function AttendanceTable({ data }: { data: Array<AdminOverviewAttendancePoint> }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="h-8 px-2 text-xs">Month</TableHead>
          <TableHead className="h-8 px-2 text-right text-xs">Attendance rate</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((point) => (
          <TableRow key={point.date}>
            <TableCell className="px-2 py-1.5 text-xs whitespace-normal">
              {monthLong(point.date)}
            </TableCell>
            <TableCell className="px-2 py-1.5 text-right text-xs tabular-nums">
              {formatPercent(point.rate)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * Single-hue column chart of monthly attendance rate against the institution
 * target: bars capped at 24px with rounded data-ends (square at the baseline),
 * a solid hairline reference line labelled in place, per-mark tooltips and a
 * table twin. Months without marked sessions report 0 — noted in the subtitle.
 */
function AttendanceChart({
  data,
  target = ATTENDANCE_TARGET,
  isEmpty = false,
  subtitle = `Present + late share of marked sessions · target ${target}% · months with no sessions count as 0%`,
  className,
}: AttendanceChartProps) {
  return (
    <ChartCard
      title="Attendance rate"
      subtitle={subtitle}
      table={<AttendanceTable data={data} />}
      isEmpty={isEmpty}
      emptyTitle="No attendance recorded"
      emptyDescription="Rates appear here once sessions are marked present or late."
      className={className}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 12, right: 8, bottom: 0, left: 0 }}
          barCategoryGap="25%"
        >
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
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tickFormatter={(value: number) => `${value}%`}
            width={38}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />

          <ReferenceLine
            y={target}
            stroke="var(--muted-foreground)"
            strokeWidth={1}
            label={{
              value: `Target ${target}%`,
              position: "insideTopRight",
              fill: "var(--muted-foreground)",
              fontSize: 11,
            }}
          />

          <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.5 }} content={AttendanceTooltip} />

          <Bar
            dataKey="rate"
            name="Attendance rate"
            fill={SERIES_COLOR}
            barSize={18}
            radius={[4, 4, 0, 0]}
            activeBar={{ fillOpacity: 0.85 }}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export { AttendanceChart, ATTENDANCE_TARGET };
export type { AttendanceChartProps };
