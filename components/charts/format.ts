/**
 * Display helpers shared by the chart primitives. Pure functions with pinned
 * locales/timezones so server- and client-rendered output always agree.
 */

const MONTH_KEY_PATTERN = /^(\d{4})-(\d{2})$/;

/** Parses an ISO calendar month key ("YYYY-MM") into the UTC instant of its first day. */
function parseMonthKey(key: string): Date | null {
  const match = MONTH_KEY_PATTERN.exec(key);
  if (!match) return null;

  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "2026-08" -> "Aug". Returns the raw key when it cannot be parsed. */
function monthShort(date: string): string {
  const parsed = parseMonthKey(date);
  if (!parsed) return date;

  return new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(parsed);
}

/** "2026-08" -> "August 2026". Returns the raw key when it cannot be parsed. */
function monthLong(date: string): string {
  const parsed = parseMonthKey(date);
  if (!parsed) return date;

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

const countFormatter = new Intl.NumberFormat("en-US");

/** 1284 -> "1,284" */
function formatCount(value: number): string {
  return countFormatter.format(value);
}

const percentFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

/** 92.48 -> "92.5%" (trailing decimals dropped when whole: 90 -> "90%") */
function formatPercent(value: number): string {
  return `${percentFormatter.format(value)}%`;
}

export { formatCount, formatPercent, monthLong, monthShort };
