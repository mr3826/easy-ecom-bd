# Archive

Dated reports from finished work. **Not maintained, and several contradict the
current code.** They are kept for the reasoning behind decisions, not as
guidance. Do not act on anything in this directory without checking it against
the source first.

Current documentation: [README.md](../../README.md) for what the application is,
[OPERATIONS.md](../OPERATIONS.md) for how it is deployed and recovered,
[AUDIT-2026-08-05.md](../AUDIT-2026-08-05.md) for the live defect backlog.

| Document | Date | Why it is here |
| --- | --- | --- |
| [PROJECT_CURRENT_STATE_AUDIT.md](PROJECT_CURRENT_STATE_AUDIT.md) | 2026-07-26 | Source-level audit. Every P0 has since been fixed; it names symbols that no longer exist. Superseded by `AUDIT-2026-08-05.md`. |
| [PROJECT_AUDIT_EXECUTION_PLAN.md](PROJECT_AUDIT_EXECUTION_PLAN.md) | 2026-07-26 | Execution plan for the audit above. Completed. Names files that were never created. |
| [FINAL_RELEASE_AGENT_PLAN.md](FINAL_RELEASE_AGENT_PLAN.md) | 2026-07-27 | Work split across `codex/*` branches that have all since been merged or deleted. |
| [REMAINING_WORK_VERIFICATION.md](REMAINING_WORK_VERIFICATION.md) | 2026-07-27 | Verification pass. Lists six features as "Confirmed missing" that have since shipped. |
| [REMAINING_WORK_EXECUTION_PLAN.md](REMAINING_WORK_EXECUTION_PLAN.md) | 2026-07-27 | Security-hardening batch derived from the above. Completed. |
| [RESPONSIVE_DESIGN_AUDIT.md](RESPONSIVE_DESIGN_AUDIT.md) | 2026-07-28 | Mobile-first audit. Still describes Nagad enum values and settings columns that migration `20260804000000` dropped. |
| [RESPONSIVE_IMPLEMENTATION_REPORT.md](RESPONSIVE_IMPLEMENTATION_REPORT.md) | 2026-07-28 | Implementation report for the audit above. Same stale Nagad references. The responsive primitives it introduced (`ui/button`, `ui/field`, `ui/drawer`) are still live. |

Still current, deliberately **not** archived:

- [../DEAD_CODE_CLEANUP_PLAN.md](../DEAD_CODE_CLEANUP_PLAN.md) — shipped 2026-08-04, but carries two open items and an explicit out-of-scope list worth reading.
- [../remaining-integration-execution-plan.md](../remaining-integration-execution-plan.md) — the production cutover is genuinely unfinished: Cloudflare still points the apex at `edge.zatiqeasy.com` and the ExonHost DNS-zone ticket is unresolved.
