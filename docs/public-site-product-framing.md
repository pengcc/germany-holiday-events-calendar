# Public Site Product Framing

## 1. Status and Purpose

Status: accepted product architecture baseline.

Germany Holiday & Events Calendar is a multilingual public planning site with three distinct
top-level areas:

1. German public holidays and school holidays;
2. Messe and trade-fair events; and
3. culture and major city events.

The site helps users plan around dates that may affect everyday life, family schedules, travel,
accommodation, or business arrangements. The three areas support related planning needs, but they
have different data sources, coverage claims, filters, and user questions. They must remain
separate public areas rather than becoming modes or overlays in one calendar.

This architecture is the baseline for public navigation and feature work. Shared navigation and
the three-area information architecture are implemented. Adding more event data, event filters,
or page-level event complexity requires a separate approved slice.

## 2. Public Areas

### 2.1 Holidays

Holidays is the default and home public area.

Current localized routes:

- `/zh`
- `/de`
- `/en`

It covers German public holidays and school holidays. Users can look up one federal state, find
public holidays common to all 16 federal states, or compare holiday overlap across selected
states. Comparison is one view mode, not the identity of the whole area.

Preferred Chinese page title:

> 德国公共假日与学校假期

Do not use `比较德国公共假日与学校假期` as the area title. It overstates one view mode and
understates the direct lookup and nationwide-common uses.

Recommended short navigation labels:

- Chinese: `假期日历`
- German: `Feiertage`
- English: `Holidays`

Detailed Holiday Explorer behavior remains defined in
[`docs/holiday-explorer-prd.md`](holiday-explorer-prd.md).

### 2.2 Trade Fairs / Messe

Trade Fairs is a first-class public area for selected official Messe and trade-fair events. It is
not a Holiday Explorer layer and must not be merged into Culture Events merely because both use
event records.

Implemented localized placeholder routes:

- `/zh/messe-events`
- `/de/messe-events`
- `/en/messe-events`

The localized placeholder routes/pages are implemented and honestly state that Trade Fairs data
is not published yet. Reviewed Trade Fairs data, event records, listings, and filters are not
implemented.

The area should help users notice selected trade-fair dates relevant to accommodation, travel,
transport, or business planning and verify each event through an official source. It is not a
complete trade-fair database and does not provide exhibitor search, booth or ticket information,
venue subevents, hotel-price prediction, or transport routing.

Recommended short navigation labels:

- Chinese: `展会活动`
- German: `Messen`
- English: `Trade Fairs`

### 2.3 Culture Events

Culture Events is the public area for selected, reviewed culture and major city events from
official sources.

Current localized routes:

- `/zh/city-events`
- `/de/city-events`
- `/en/city-events`

The current route name remains stable; the public label describes the product area. A future route
rename is not implied by this document.

Suitable records include approved top-level events such as Berlinale, Karneval der Kulturen,
Festival of Lights, and CSD Berlin. This area is not a complete Berlin or Germany event calendar.
It excludes ordinary concerts, nightlife and party listings, small local events, programme items,
stages, maps, routes, and traffic-closure details.

Recommended short navigation labels:

- Chinese: `文化活动`
- German: `Kultur-Events`
- English: `Culture Events`

## 3. Shared Navigation Requirements

The public site implements shared navigation across Holidays, Trade Fairs, and Culture Events.
Navigation must continue to:

- make the current area clear;
- preserve the current language where practical;
- provide a direct path back to the Holidays home area;
- distinguish implemented areas from planned areas honestly; and
- avoid relying on browser back navigation or isolated page-specific return links.

The product model includes all three areas. The implemented Trade Fairs entry links to the
localized placeholder page; it must not redirect to Holidays or Culture Events. The placeholder
does not imply that reviewed Trade Fairs records, listings, filters, or full page-level event
functionality are implemented.

## 4. Area and Data Boundaries

Holiday and event data retain separate semantics:

- Holidays use federal states, public/school categories, coverage warnings, regional advisories,
  nationwide-common logic, and multi-state overlap.
- Trade Fairs and Culture Events use selected official-source records, event dates, city,
  category, reviewed impact level where applicable, and an official source URL.
- Trade Fairs and Culture Events may share technical event-contract infrastructure while remaining
  separate public product areas and independently scoped datasets or views.

No public area may imply complete event coverage. An empty event result means there are no matching
published records from the selected covered sources; it does not mean no events exist.

## 5. Implementation Sequence

Treat the completed navigation and placeholder work as the current baseline:

1. shared three-area navigation and a neutral Holiday area title are implemented;
2. the localized Culture Events routes remain implemented and must keep working;
3. localized Trade Fairs placeholder routes/pages are implemented; and
4. reviewed Trade Fairs data, event records, listings, filters, or page-level event complexity
   require a separate approved implementation slice.

This sequence prevents new event records or controls from reinforcing an unclear two-area or
single-calendar architecture.

## 6. Non-Goals

This framing does not authorize:

- application, route, data, schema, dependency, or deployment changes;
- merging City Events into Holiday Explorer;
- representing Trade Fairs as a Holiday Explorer mode or Culture Events category in public
  navigation;
- comprehensive event discovery or Messe database functionality;
- hotel-price prediction, booking, traffic routing, or closure details; or
- user accounts, saved events, alerts, or real-time upstream fetching.

## 7. Related Documentation

- [`docs/holiday-explorer-prd.md`](holiday-explorer-prd.md): behavior of the Holidays area.
- [`docs/data-workflow.md`](data-workflow.md): local review and publication workflow.
- [`.codex/project/project-guideline.md`](../.codex/project/project-guideline.md): durable current
  project facts and operating constraints.
