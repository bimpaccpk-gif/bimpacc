# Supabase disk I/O optimization plan

Date: 2026-09-04  
Project: BIMPACC-LMS (`bsvlvaeacsqntoouaxxa`)  
Status: Notification removal implemented locally at the owner's request. Deployment and the table-removal migration are pending. Query/RLS optimization remains planned.

## Objective

Remove the in-app notification system, reduce avoidable database work, improve lesson loading, and establish whether the current compute can support normal student activity. Preserve enrollment, role, account pause, and content lock behavior.

## Evidence and limits

- The warning email arrived on September 4 at 02:40 UAE time (September 3 at 22:40 UTC).
- The live inspection reported `ACTIVE_HEALTHY`, a Free organization, and a database size of approximately 24 MB. This status does not reveal the remaining disk burst budget.
- Retained query statistics show one lesson-list query averaging approximately 4.62 seconds across 436 executions and another averaging 3.45 seconds across 106 executions. These are historical averages, not measurements of current page latency.
- Supabase's performance advisor flagged 34 policies with repeated authentication checks and two foreign keys without covering indexes. Advisory counts alone do not identify the disk warning's cause.
- Before removal, `DashboardShell` mounted two `NotificationBell` instances in desktop/mobile navigation. Each started its own 30-second timer, even though CSS hid one at each breakpoint.
- Each old refresh called `getUserNotifications()` and fetched all notifications, although the UI displayed only the latest 15. Both the polling and initial dashboard fetch have now been removed locally.
- The live notification inventory found zero rows, no referencing database functions, and no Realtime publications for the table. Its remaining dependencies were its own policies and check constraint.
- Cumulative temporary-file activity was substantial, while the recorded shared-buffer hit ratio was very high. Investigate recent temporary writes, memory/swap, and background work rather than attributing the warning solely to application reads. These cumulative counters cannot establish the timing or cause of the alert.

## Phase 1: Establish a baseline

1. Review Database Health around the email timestamp and during a representative busy period: disk budget consumption, IOPS/throughput, CPU I/O wait, memory/swap, connections, and API errors.
2. Take two timestamped database-statistics snapshots over a defined observation window. Compare deltas in query calls, execution time, temporary writes, and WAL volume; preserve existing statistics instead of resetting them.
3. Verify the production build has no notification actions, UI, or polling. Confirm zero notification requests after deployment on desktop and mobile.
4. Capture current lesson-query plans with actual application roles and representative synthetic users in a local/test database. A privileged query that bypasses RLS is not a valid comparison.
5. Inventory live policies, access functions, indexes, and migration history before preparing database changes. Build the test schema from verified current definitions.

Deliverable: A short baseline with timestamps, workload context, and the largest current contributors. If the alert-period metrics are unavailable, document that gap and use a fresh comparable window.

## Phase 2: Remove the notification system

The owner replaced the polling-optimization proposal with complete removal on September 4, 2026.

1. Delete the notification bell and its polling timer, plus the notification server-actions module.
2. Remove notification fetches, imports, props, exports, and shared types from dashboard layout and navigation.
3. Verify application compilation and check that account menus and navigation remain available at both breakpoints.
4. Deploy the application removal first, then retire the empty `public.notifications` table through `supabase/migrations/20260904104242_remove_notification_system.sql`. Keep historical migrations for database history. The migration locks the table before checking that it is empty and uses a guarded drop without CASCADE, so unexpected rows or external dependencies stop removal.
5. Verify the final schema and rerun advisors after applying the migration. Existing open browser tabs must refresh to load the new application; removed server actions cannot continue database polling once the new deployment serves them.

Primary files: `components/layout/notification-bell.tsx`, `components/layout/dashboard-shell.tsx`, `components/layout/app-sidebar.tsx`, `components/layout/mobile-topbar.tsx`, `app/actions/notifications.ts`, and `app/(dashboard)/layout.tsx`.

Acceptance: Zero notification components, server actions, types, fetches, or timers in the application; zero notification queries from the updated application. Once the migration is applied, the public notification table and its policies/indexes are absent. Retained historical migrations and backup schemas are not active application functionality. Actual overall disk savings still require measurement.

Local validation on September 4: production build and its TypeScript check passed; source and production server-action manifest searches found no remaining notification references. Targeted ESLint passed for the dashboard/navigation files; `types/index.ts:123` still has its pre-existing `AuditLogEntry.details: Record<string, any>` lint error. The live table has only been inspected; the removal migration has not been applied. Production deployment and post-deployment browser/database verification remain pending.

## Phase 3: Optimize lesson queries and RLS

1. Reproduce the slow lesson/subject queries using realistic admin, instructor, and student contexts. Inspect `EXPLAIN (ANALYZE, BUFFERS)` for repeated function calls, nested loops, row filtering, and temporary I/O. Use bounded read-only checks; do load testing in the test environment.
2. Review `is_admin()`, `is_instructor()`, `is_active_user()`, `can_access_lesson(id)`, `can_access_subject(id)`, and their private helpers. Identify repeated user/enrollment lookups and simplify only the measured bottlenecks.
3. Where semantics permit, evaluate row-independent identity/role checks once per statement using the documented SELECT/init-plan pattern. Row-dependent checks such as `can_access_lesson(id)` must still evaluate the correct lesson's permissions.
4. Preserve existing access rules when simplifying policies. Do not assume that reducing the number of advisor warnings proves either improved performance or equivalent authorization.
5. Add or adjust indexes only when the relevant query plan justifies them. Inspect existing indexes first, including enrollment/content-access lookups. A sequential scan on a tiny table can be appropriate.
6. Store the final database changes in a migration with the previous definitions and a tested rollback. Generate migration names using the installed Supabase CLI. Apply production DDL through the migration mechanism after verification.

Acceptance: The reproduced slow queries improve under the same role, data, and workload. Initial target: at least 80% lower execution time for a query that still reproduces the historical four-second behavior, ideally below 500 ms. If it no longer reproduces, prioritize current measured hotspots instead. Relevant advisor warnings should decrease without introducing new security findings.

## Phase 4: Verify and release in separate steps

- Removal checks: no notification UI or requests on desktop/mobile, account menus and navigation still work, and no notification actions are present in the production action manifest.
- Access checks: anonymous visitor; enrolled student; another course's student; paused/unapproved student; locked lesson/subject/semester/course; instructor; admin; super-admin. Cover each supported course hierarchy and both allowed and denied operations affected by the migration.
- Run targeted lint/type checks, the production build, application smoke checks, and database permission tests. Run security and performance advisors after database changes.
- Keep the notification release and database migration separate so their effects are measurable and either can be rolled back independently. Verify the backup/recovery path before the database release.
- Record before/after lesson timings and notification request counts, with the release timestamps.

## Phase 5: Observe and decide on compute

Compare the next 24–48 hours, including a busy student period, with the baseline. Assess disk-budget depletion, disk throughput/IOPS, temporary writes, memory/swap, timeouts, and query latency relative to traffic. Lower traffic alone is not evidence that the change worked. This observation is a planned follow-up, not an automation already scheduled.

If exhaustion or timeouts continue, use the measured bottleneck to select a paid compute size with sufficient memory and sustained I/O. Confirm the project's actual compute size, current pricing, and downtime window before a paid change. If users are already unable to use the LMS, capacity relief can precede the optimization rollout. If measured application load does not explain the warning, provide Supabase support with timestamps and metrics.

## Scope decisions

The current implementation is limited to notification removal. Query/RLS improvements remain a subsequent phase. Broad authentication rewrites, cross-request caching of permissions, removing indexes solely because they are marked unused, and changing global database memory settings are outside the initial change. Cache Components are not currently enabled; consult the installed Next.js documentation before any later caching work.

## References

- [Original warning email](https://mail.google.com/mail/#all/1a0696e91e5b8e2c)
- [Supabase High Disk I/O guide](https://supabase.com/docs/guides/troubleshooting/exhaust-disk-io)
- [Supabase RLS performance advisor](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan)
- [Supabase Compute and Disk](https://supabase.com/docs/guides/platform/compute-and-disk)
- [Supabase changelog](https://supabase.com/changelog)
- Installed Next.js guides: `node_modules/next/dist/docs/01-app/02-guides/authentication.md` and `node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md`.
