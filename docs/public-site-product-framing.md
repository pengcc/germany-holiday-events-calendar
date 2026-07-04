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

This architecture is the baseline for future public navigation and feature work. Shared navigation
and the three-area information architecture must be established before adding more event data,
event filters, or page-level event complexity.

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

Prospective localized route pattern:

- `/zh/messe-events`
- `/de/messe-events`
- `/en/messe-events`

The route and page are not implemented yet. Their later implementation requires a separate
approved slice.

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

The public site must provide shared navigation across Holidays, Trade Fairs, and Culture Events.
Navigation must:

- make the current area clear;
- preserve the current language where practical;
- provide a direct path back to the Holidays home area;
- distinguish implemented areas from planned areas honestly; and
- avoid relying on browser back navigation or isolated page-specific return links.

The navigation implementation may be staged, but the product model always includes all three
areas. A planned Trade Fairs entry must not silently redirect to Holidays or Culture Events.

Whether the unimplemented Trade Fairs entry appears immediately as a non-link, waits until its page
exists, or later receives a placeholder page is an implementation decision for a separate slice.
This document does not authorize a placeholder route.

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

Use this sequence for the next public-site work:

1. establish shared three-area navigation and a neutral Holiday area title;
2. keep the current localized Culture Events routes working;
3. add a Trade Fairs route and page only through a separately approved implementation slice; and
4. add more event data or event filters only after the navigation model and area ownership are
   clear.

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
