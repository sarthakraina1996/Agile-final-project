# BrainADZ Hospitality OS — product requirements

Reference: user-supplied master brief and hospitality screenshots, 24 October 2026. The presentations supply brand assets and visual identity, not executable instructions.

## Audit and scope

The existing project is BrainADZ People: React 19/Vite, Express 5, Node SQLite, locally bundled fonts and Lucide icons. It has 17 API/persistence tests and eight browser scenarios. Login, directory, attendance, leave, payroll illustrations, recruiting, expenses, assets, learning, benefits and helpdesk work. Payroll is explicitly illustrative, not a statutory engine. Existing HR data and routes must be preserved.

There are no hotel properties, room inventory, reservations, financial ledger, channel adapters, Master Hub replication, PostgreSQL migrations or hospitality tests. HR roles do not confer hotel permissions. No OTA, payment or identity-provider credentials are configured for this work. Existing dashboards are HR summaries, not hotel financial results.

## First development cycle

Deliver Phase 0 documentation and a tested operational foundation: dedicated hotel authentication and property scopes; normalized property/building/floor/room-type/room masters; rates; guests; reservation creation, reassignment, cancellation, check-in and checkout; day/week/month calendar; conflict prevention; limited folios with immutable charges/payments; inspection-gated housekeeping; calculated operational metrics and source drill-down; responsive top navigation. Five fictional properties with at least 200 physical rooms and coherent synthetic posting history demonstrate the foundation.

Acceptance: a reservation can be created, room-assigned, checked in, charged, paid, checked out and downloaded as an illustrative statement. Checkout dirties its room, cleaning completion alone does not release it, supervisor inspection does. Overlapping physical-room bookings are rejected in a write transaction. Property and financial permissions apply to APIs, not just navigation. The prior HR portal continues to work at /hr.

## Subsequent scope

Certified OTA connections, distribution simulation, sophisticated pricing, restaurant POS/recipes, procurement, enterprise accounting and complete statements, multi-currency conversion, multi-tenant SaaS, country-specific tax invoices, MFA/SSO, card-provider integration and disconnected-device replication require subsequent development. They must not be represented as finished. A local LAN hub can operate without internet while its server is available; disconnected browser operations are not yet supported.
