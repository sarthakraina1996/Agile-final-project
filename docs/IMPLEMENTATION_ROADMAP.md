# Implementation roadmap

0. Audit and documentation: preserve HR, establish namespaces, branding and module boundaries.
1. Operational foundation: authentication/scopes; property, room and guest data; rate plans; transactional reservations, calendar and front desk. Acceptance includes overlapping booking rejection and property isolation tests.
2. Guest operations: inspection-based housekeeping, immutable folios, settlements, controlled reversals, statements; then night audit, cashier shifts, secure document handling and full guest services.
3. Restaurant/inventory: real KOT lifecycle, recipe consumption, stock ledger and procurement approvals. Acceptance includes no negative stock and no duplicated COGS.
4. Accounting: chart of accounts, balanced journal entries, period locks, OPEX/CAPEX classification, allocations, tax configuration, budgets and weighted consolidation. Reconcile operational postings to GL and statements.
5. Distribution/revenue: idempotent channel simulator with failed events and reconciliation, transparent demand-sensitive rules, approvals, rollback; authorized providers only after credential/certification validation.
6. Enterprise expansion: banquets, spa, loyalty, central kitchen, HR/payroll adapters, BI and corporate sales.
7. Hardening: MFA, central PostgreSQL, tenant isolation, durable sync queues, leases, recovery/load/security reviews and jurisdiction validation.

The current user request explicitly ends with implementing the first high-priority work package after audit. Work must be reviewable, functional and tested; it must not claim all seven phases have shipped.
