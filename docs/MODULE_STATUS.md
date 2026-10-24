# Module status — cycle 1 audit baseline

Status vocabulary: completed and tested; implemented but requiring improvements; partially implemented; not started; blocked by an external integration or dependency.

| Module                                          | Audit baseline                                | Intended first-cycle result                             |
| ----------------------------------------------- | --------------------------------------------- | ------------------------------------------------------- |
| Existing HR portal and Windows launcher         | Completed and tested                          | Preserve and regression test                            |
| Hotel authentication/property scopes            | Not started                                   | Dedicated roles and API enforcement                     |
| Property/building/floor/type/room master        | Not started                                   | Five properties, 200 rooms and room details             |
| Reservations/calendar/front desk                | Not started                                   | Persistent workflows and conflict controls              |
| Guests                                          | Not started                                   | Profile, preferences and stay history                   |
| Housekeeping                                    | Not started                                   | Dirty → cleaning → inspection → readiness               |
| Folios and cashiering                           | Not started                                   | Append-only charges/payments and balance-gated checkout |
| Operational dashboard/metrics                   | Not started                                   | Derived metrics with date/property scope and drill-down |
| Enterprise finance/general ledger               | Not started                                   | Explicitly unavailable, roadmap                         |
| POS, recipes, inventory, procurement            | Not started                                   | Roadmap                                                 |
| Channel manager simulator                       | Not started                                   | Roadmap                                                 |
| Certified OTA/payment/payroll connectors        | Blocked by external integration or dependency | Credentials/contracts and development required          |
| Pricing engine/forecasts                        | Not started                                   | Roadmap                                                 |
| Banquets, spa, loyalty                          | Not started                                   | Roadmap                                                 |
| Device offline queue/central sync               | Not started                                   | Roadmap; local-server operation only                    |
| MFA, tenant SaaS, privacy/compliance validation | Not started                                   | Production hardening                                    |

The final verified status and development log are appended after testing. No intended result in this table constitutes a completed feature.

## Cycle 1 delivered and verified

| Area                                                         | Status                                              | Actual behavior and remaining scope                                                                                                                                                                                                           |
| ------------------------------------------------------------ | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Audit, architecture and scope documentation                  | Completed and tested                                | Seven required documents, schema versions and explicit limitations recorded                                                                                                                                                                   |
| Original HR portal                                           | Completed and tested within its existing demo scope | Existing 17 API/persistence checks and eight browser scenarios retained at /hr                                                                                                                                                                |
| Hotel sessions and property authorization                    | Implemented but requiring improvements              | Five seeded roles, scoped API access, financial visibility, login throttling, logout; production provisioning/MFA/SSO remain absent                                                                                                           |
| Property and room master                                     | Partially implemented                               | 5 profiles, 200 rooms, 20 room types, 10 rate plans, building/floor data; property settings, base rates and maintenance status editable; creation/deletion, asset/warranty administration and country configuration remain                    |
| Reservation engine and calendar                              | Partially implemented                               | Persistent single-room reservations, request deduplication, transactional overlap checks, rate plans, validated movement, cancellation, calendar filters/date navigation and pagination; group/split/unassigned inventory and packages remain |
| Front desk and guests                                        | Partially implemented                               | Arrivals/in-house/departures boards, profile/history, check-in/readiness, balance-gated checkout; identity files, shifts, night audit, early/late stay accounting and service workflows remain                                                |
| Folio controls                                               | Partially implemented                               | Integer minor units, append-only entries, linked reversals, payment deduplication, role checks and downloadable account statements; deposits, refunds, corporate AR, GL and certified invoices remain                                         |
| Housekeeping                                                 | Partially implemented                               | Task creation, start/finish timestamps, manager inspection, checkout dirtying and readiness; no linen/stock/labour costing or advanced scheduling                                                                                             |
| Operational metrics                                          | Partially implemented                               | Posted net revenue, departmental mix, weighted occupancy, ADR, RevPAR, TRevPAR, prior-period comparisons and source drill-down; expenses/cost allocations, GOP, financial statements and advanced reporting remain                            |
| Distribution, POS, procurement, pricing, enterprise services | Not started                                         | Honest roadmap in More; no decorative functional claims                                                                                                                                                                                       |
| Provider integrations                                        | Blocked by external integration or dependency       | No OTA contracts/certification, payment provider, SSO, payroll or licensed competitor-data integration                                                                                                                                        |
| Replicated offline platform                                  | Not started                                         | Server-local operation is available, but no disconnected device queue, central acknowledgement or split-brain protection                                                                                                                      |

## Verification log

- Native API/persistence suite: 29 passed; detailed coverage and benchmarks in TEST_STRATEGY.md.
- Browser coverage: hotel top navigation and property/date controls; booking and actual drag/drop; guest journey and housekeeping; property/rate edits; role visibility; desktop/tablet/mobile widths; existing HR regression scenarios.
- Seed: at least 365 days of source records; checked-out synthetic folios balance to zero; physical room assignments do not overlap. All hotel data is fictional.
- Startup: two Vite entry points, shared Express server and Windows launcher. Both SQLite files remain separate and excluded from Git.

## Next development task

Complete the remaining Phase 2 guest operations before POS or distribution: idempotent nightly room-charge posting, persisted audit-run state and interrupted-run recovery, cashier shifts, actual check-in/out timestamps, deposits/refunds and controlled early/late departures. Acceptance: rerunning or interrupting night audit cannot duplicate charges; actual-stay changes preserve financial provenance; checkout cannot bypass unposted required charges; all actions enforce property and role scope.
