# Test strategy

Preserve existing HR API, persistence and browser tests. Add separate hotel integration tests using a temporary or in-memory database, independent of real users and local data.

Priorities: authenticated API access; property isolation for reads and writes; financial-data role limits; valid stay dates and capacity; room/type/property consistency; overlapping assignments; cancellation and half-open boundaries; transactional booking attempts; idempotent charges/payments; append-only ledger; balanced guest folio; no checkout while owing; checkout dirties room; attendant completion cannot bypass supervisor inspection; aggregate metric denominator and tax treatment; zero-denominator behavior; data survives database reopen.

Browser tests: login; top navigation; property/date selection; real reservation form, calendar booking selection and movement; check-in; folio charge/payment; checkout and housekeeping inspection; room and guest details; original HR at /hr. Inspect desktop, tablet and mobile widths. Reject page errors and document overflow outside the calendar's intentional scrolling region.

Performance: record boot/seed and dashboard query timings over 200 rooms and 12 months of coherent seed data. This is a smoke benchmark, not enterprise load certification. Unimplemented OTA, queues, procurement, GL and regulatory workflows are unrun, not passed or skipped successes.

## Verified first-cycle results

- 29 native API, calculation, scope, conflict, financial control, migration and persistence tests pass (17 retained HR tests and 12 hotel tests).
- 13 Playwright scenarios pass: 5 hospitality journeys plus 8 retained HR regression scenarios. The calendar test uses real browser drag-and-drop and verifies the persisted arrival change through the folio API.
- Vite production build includes two separate HTML entry points. A production-server browser smoke check covers both entry points and 1440/1024/768/390 px layouts.
- Demonstration seed: 5 properties, 200 rooms, 15,520 stays, 65,668 immutable posting rows. On the current machine, a new in-memory seed took approximately 0.93 seconds; a 366-day group metrics calculation took approximately 1.55 seconds. These are single-process smoke timings, not load-test certification.
- Remaining external integration, full accounting, tenant isolation, night audit, procurement and replicated offline tests are unrun because those implementations do not yet exist. They are not included in the passed counts. Windows wrappers are retained; the shared Node launcher/server are exercised on Linux, not claimed as a native Windows test.
