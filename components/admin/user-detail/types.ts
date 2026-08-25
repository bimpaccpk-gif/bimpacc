import type { UserDetailData } from "@/types";

/** The full user row returned by `getUserDetail`. */
export type UserDetailUser = UserDetailData["user"];

/** Aggregate counters rendered as KPI tiles in the overview panel. */
export type UserDetailStats = UserDetailData["stats"];
