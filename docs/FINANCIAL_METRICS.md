# Financial and operational metric definitions

All demonstration figures derive from persisted fictional transactions. Currency is property-specific; group reporting may sum only matching currencies until FX consolidation exists. INR amounts use integer paise internally. Tax is reported separately from operating revenue; payments reduce guest receivables, not revenue. Refunds/reversals are not silently removed.

Reporting intervals use inclusive start/exclusive end business dates. Reservations use arrival-inclusive/departure-exclusive room nights. Metrics expose their source category, reporting dates and drill-down records. Undefined ratios return null, displayed as an em dash.

| Metric                | Formula / source                                                       | Qualification                                                   |
| --------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------- |
| Operating revenue     | Net revenue postings, excluding tax                                    | Persisted folio charges only; not a full general ledger         |
| Room revenue          | Net room-department revenue postings                                   | Revenue posting date drives recognition                         |
| Sold room nights      | Occupied or completed reservation nights intersecting the period       | Cancelled bookings excluded; zero-rate stays count in occupancy |
| Available room nights | Physical room nights minus maintenance blocks                          | Same-day cleaning is not a night inventory exclusion            |
| Occupancy             | Sold nights / available nights × 100                                   | Weighted from denominators, never averaged property ratios      |
| ADR / ARR             | Room revenue / sold nights                                             | No result when zero sold nights                                 |
| RevPAR                | Room revenue / available nights                                        | Net of tax                                                      |
| TRevPAR               | All operating revenue / available nights                               | Includes posted ancillary charges                               |
| Guest outstanding     | Sum(debit − credit), including charge taxes                            | Based on immutable folio ledger                                 |
| ALOS (planned)        | Completed stay nights / completed stays                                | Formula documented; not yet exposed by the API                  |
| Booking source share  | Non-cancelled reservations per source / all non-cancelled reservations | Booking count, not revenue share                                |
| Comparison            | Current ratio or amount vs recalculated equal-length prior interval    | Zero prior denominator means unavailable growth                 |

GOP, EBITDA, EBIT, net profit, cash flow, working capital, CAPEX, COGS, room cost allocation, budget variance, licensed competitor indices and F&B metrics require their missing accounting/inventory sources. They must display an explicit unavailable state rather than invented actuals. Folio statements are demonstration account statements, not jurisdiction-certified GST/VAT invoices. Full double-entry accounting and statutory billing remain Phase 4 work.

## Current boundaries

All five demo properties use INR and Asia/Kolkata. Multi-currency display, FX conversion and new currency configuration are not exposed. Revenue source drill-down shows the latest 250 ledger entries in the selected period (and up to 60 matching entries in the compact drill-down dialog); it is not a complete paginated enterprise ledger export. Occupied/closed reservation nights use scheduled arrival/departure dates, not actual timestamp-based stay adjustments. Early-departure accounting and automatic night-charge completeness require the next operational phase. No forecast values or GOP/net-profit figures are invented.
