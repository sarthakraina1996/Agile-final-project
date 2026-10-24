# Architecture and gap analysis

## Retained foundation

Use the existing React/Vite/Express/SQLite stack to preserve the tested HR portal and Windows local launcher. Hotel code lives under client/hospitality and server/hospitality, with a separate database and API namespace. HR remains at /hr and /api; hospitality uses / and /hospitality-api/v1. Two Vite entry points avoid mixing application state or styles. Shared package dependencies and bundled fonts are reused.

## Hotel domains

Versioned SQL migrations → coherent demo seed → auth/property access → reservation/room domain services → posting and housekeeping services → metrics → API routes → reusable UI, calendar, forms, pages. Monetary values are integer minor units; reports exclude tax from revenue. SQLite foreign keys, WAL, busy timeout and BEGIN IMMEDIATE serialize inventory mutations. Database triggers provide another barrier against overlapping room assignments. Financial records are append-only; corrections require reversal entries.

## Authentication

Hotel sessions and user roles are independent of HR. Owner can access every property and financial reporting. General manager, front desk and housekeeping accounts have property scopes and capability checks. Sessions use salted scrypt verification and HttpOnly SameSite cookies; hosted HTTPS uses Secure cookies. Local HTTP launcher remains supported. Rate limiting and same-origin mutations apply. MFA and external identity providers are future work, not currently claimed.

## Offline roadmap

Current SQLite server is a single local property/portfolio hub. Browsers on the hub can continue working during an internet outage because UI, assets, API and database are local. No service worker or device-side write queue is present. Future topology: devices → property hub → central server → authorized providers. The central event envelope requires event ID, tenant/property/device ID, sequence, timestamp, idempotency key and payload hash. Central acknowledgements must be durable; inventory partition leases prevent split-brain overselling. Financial postings are never last-write-wins. Postgres central storage, durable outbox/inbox, reconciliation and recovery tests precede any claim of replicated offline operation.

## Deployment and recovery

HOSPITALITY_DATABASE_PATH selects the hotel database (default .data/hospitality.sqlite); DATABASE_PATH retains its existing HR meaning. DEMO_MODE controls seeding and shared demo logins. Existing HR administrator bootstrap does not provision hotel accounts. Snapshot the stopped hub or use SQLite online backup; never copy only the main file while WAL writes are active. Restore to a staging path, run integrity/foreign-key checks and reconcile posting totals before reopening operations. Multi-process scaling, tenant isolation, disaster recovery automation and public production hardening remain roadmap work.

## Brand assets

`client/public/hospitality/brainadz-live.png` is rendered directly from the top-left logo on page 4 of the user-supplied BrainADZ Live PDF, using a PDF clipping rectangle (22,22,215,110) at 3x resolution. It has not been replaced with a generated brand approximation. The bedroom image is generated demonstration photography and is labelled accordingly. Neither the app nor the room image requires a third-party image/font host at runtime.
