# Hospitality database schema

SQL migration files are the authoritative schema. Separate hotel database preserves existing HR employees, users, sessions and records.

Entities: migrations; properties (currency/timezone/policies); buildings; floors; room_types (default amenities/capacity/base rate); rooms (physical identity, independent cleaning and maintenance states, overrides); guests; hotel_users/property access; hotel_sessions; reservations (half-open stay interval, source, rate, status); folio_entries (immutable debit/credit in integer minor units with actor, source and tax); housekeeping_tasks; room_blocks; audit_events. Property foreign keys and server-side access checks apply throughout. A migration version table makes repeat startup safe.

Room type is never a physical room. Reservation assignment must match property and room type. Departure dates are exclusive, allowing same-day turnover subject to inspection readiness. Cancelled bookings do not consume inventory. Blocked/out-of-order rooms are unavailable. Check-in additionally requires readiness. Financial entry edits and deletes are prevented; reversal references preserve provenance. Indexes cover property/date/status, room/stay dates and folio lookups.

The first cycle is a single organization with multiple properties, not independent customer tenants. Cross-tenant SaaS isolation needs a separate implementation and tests before release. Property-level scope tests must not be described as multi-tenant testing.

## Migration 2

`002_rate_plans.sql` adds normalized property rate plans and a reservation rate-plan reference. Standard BAR and bed-and-breakfast plans are seeded. The stored nightly rate is fixed at reservation creation; later base-rate edits do not reprice existing bookings. Booking idempotency hashes the submitted payload, not a subsequently changed room-type price.
