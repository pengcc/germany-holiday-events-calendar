PRD: Germany Holiday & Events Calendar

1. Product Name

Germany Holiday & Events Calendar

Recommended repository name:

germany-holiday-events-calendar

Chinese name:

德国假期与重要活动日历

The previous repository name holiday-sync-germany was suitable for holiday overlap comparison, but the new product scope includes both German holidays and selected major events. The new name is clearer and more extensible.

2. Product Summary

Germany Holiday & Events Calendar is a static-first, multilingual calendar tool for browsing and comparing German public holidays, school holidays, and selected major events.

The product helps users discover, compare, join, avoid, or plan around important dates.

It should support different user intentions:

* Find overlapping public holidays and school holidays across German federal states.
* Plan family travel around school holidays.
* Discover major events that users may want to attend.
* Avoid crowded, expensive, or traffic-disrupted periods.
* Check whether selected events may affect hotels, city traffic, or road closures.

The product must remain neutral. Major events are not treated as purely negative “impact” or “risk”. Some users may want to participate in them, while others may want to avoid them.

3. Product Goals

3.1 Primary Goals

1. Provide a clear way to browse German public holidays and school holidays.
2. Allow users to select:
    * all Germany
    * one federal state
    * multiple federal states
3. Allow users to filter by:
    * year
    * month
    * quarter
4. Highlight overlapping holiday periods across selected states.
5. Provide a mobile-first, polished, practical calendar experience.
6. Keep the public frontend static-only and deployable on Cloudflare Pages free tier.
7. Keep data tooling local-only and file-based.
8. Preserve a manual refresh/review/publish architecture for data quality.
9. Prepare for a neutral Major Events Layer, initially for Berlin.

3.2 Secondary Goals

1. Add selected Berlin trade fairs and major sports events.
2. Show planning-relevant signals such as:
    * possible hotel demand
    * possible crowd level
    * possible traffic changes
    * possible road closures
3. Support both “I want to attend this event” and “I want to avoid this period” use cases.
4. Keep the architecture extensible for more cities and event categories later.

4. Non-Goals

The product must not introduce these without explicit approval:

* hosted backend runtime
* user accounts
* authentication
* personal profiles
* saved trips
* personal data storage
* telemetry or analytics
* paid APIs
* API keys
* recurring-cost infrastructure
* hotel booking
* travel booking
* affiliate links
* automatic alerts or notifications
* arbitrary local event aggregation
* real-time event monitoring
* deployed Data Studio
* public data modification UI

The public frontend should only consume reviewed/generated static JSON.

5. Target Users

5.1 Chinese-speaking families in Germany

They want to compare school holidays and public holidays across states, especially when planning family travel.

Example questions:

* When do Berlin and Brandenburg have overlapping school holidays?
* Which month has the most holidays?
* Which quarter is better for travel?

5.2 Travel planners in Germany

They want to avoid peak periods or understand busy travel windows.

Example questions:

* Which dates may be crowded because several states have holidays?
* Is there a major event in Berlin during my planned trip?
* Are hotels likely to be tight during that period?

5.3 Event-oriented users

They may want to discover or attend important events.

Example questions:

* What major events are happening in Berlin this quarter?
* When is the Berlin Marathon?
* Which major trade fairs are coming up?

5.4 Users who want to avoid busy periods

They may use the same event data negatively.

Example questions:

* Which Berlin dates should I avoid because of major events?
* Are there possible road closures?
* Might hotel prices be higher?

6. Core User Stories

6.1 Holiday Comparison

As a user, I want to select multiple German federal states so that I can compare their public holidays and school holidays.

Acceptance criteria:

* User can select all Germany, one state, or multiple states.
* Selected states are clearly visible.
* Holidays for selected states are shown in the calendar.
* Overlapping dates are highlighted.
* User can switch between month, quarter, and year views.

6.2 Month and Quarter Filtering

As a user, I want to filter by month or quarter so that I can focus on a specific planning period.

Acceptance criteria:

* User can select a year.
* User can select a month.
* User can select a quarter.
* Calendar updates based on the selected period.
* List/detail views show only records in the selected period.

6.3 Holiday Detail View

As a user, I want to click a date and see what holidays or events are relevant on that date.

Acceptance criteria:

* Date detail shows public holidays.
* Date detail shows school holidays.
* Records include state, name, type, date/range, and source confidence where relevant.
* Empty dates have a clear empty state.

6.4 Major Events Layer

As a user, I want to see selected major events in Berlin so that I can decide whether to attend, avoid, or plan around them.

Acceptance criteria:

* Event layer can be turned on/off.
* Initial city scope is Berlin only.
* Initial event categories are trade fairs and major sports events such as marathons.
* Events are shown neutrally.
* Events can display planning signals such as possible hotel demand, crowd level, traffic changes, or road closures.
* Event details include source information and confidence level.

6.5 Mobile-first Usage

As a mobile user, I want the calendar to be easy to use on my phone.

Acceptance criteria:

* Filters are usable on small screens.
* Calendar is readable on mobile.
* Date detail can appear as a bottom sheet or compact panel.
* Important information is not hidden behind hover-only interactions.
* Keyboard and focus behavior are acceptable for core controls.

7. Product Scope

7.1 MVP Scope

MVP should focus on holiday browsing and comparison.

Included:

* multilingual public frontend
* German public holidays
* German school holidays
* all 16 federal states
* all Germany / one state / multiple states selector
* year selector
* month filter
* quarter filter
* calendar view
* overlapping holiday highlighting
* date detail view
* generated JSON consumed by frontend
* static deployment to Cloudflare Pages

7.2 Post-MVP Scope

Included after MVP:

* Berlin Major Events Layer
* selected trade fairs
* selected major sports events
* event category filter
* planning signals
* event detail view
* local data workflow extension for events

7.3 Future Scope

Possible later extensions:

* more cities
* more event categories
* calendar export
* iCal subscription
* improved event source review workflow
* travel planning helper views
* “busy period” summary by city/state
* public shareable filter URLs

8. Product Positioning

The product should be practical, neutral, and planning-oriented.

Avoid framing:

Risk alert
Impact warning
Disruption monitor

Prefer framing:

Holiday and events calendar
Planning-relevant dates
Join or plan around major events
Useful dates for travel planning

9. Architecture Direction

Use one monorepo.

Recommended structure:

germany-holiday-events-calendar/
  apps/
    web/
      # deployable static frontend
      # Cloudflare Pages target
    data-studio/
      # local-only frontend/admin UI
      # not deployed
      # runs on 127.0.0.1
  packages/
    data-core/
      # shared schemas, types, validation, normalization, calendar logic
  tools/
    data-cli/
      # local data commands
  data/
    # versioned sources, accepted data, reviews, overrides
  dev_locals/
    # local runs, plans, temporary data
    # not committed unless explicitly approved

9.1 Public Frontend

apps/web is the public app.

Rules:

* static-only
* deployable to Cloudflare Pages free tier
* no server runtime
* no server functions
* no secrets
* no paid APIs
* reads generated JSON only
* does not modify data
* does not perform upstream data fetching
* should be mobile-first

9.2 Local Data Studio

apps/data-studio is a local-only UI.

Rules:

* not deployed
* not public
* runs only locally, ideally bound to 127.0.0.1
* can access local files and local server functions
* can help review, validate, compare, and publish data
* should not be treated as the public frontend
* does not call the deployed frontend
* shares schemas/types/data helpers with the public frontend through packages/data-core

9.3 Shared Data Core

packages/data-core should own:

* holiday schema
* planning event schema
* German state metadata
* date/range helpers
* calendar index logic
* validation helpers
* frontend JSON contract types

9.4 Local Data CLI

tools/data-cli should support local workflows such as:

* refresh
* validate
* review
* publish
* rebuild
* rebuild check

Existing tooling can be kept, cleaned up, refactored, or replaced based on evidence. It should not be rewritten purely for architectural perfection.

10. Existing Code Policy

The project should now use agent-project-foundation-kit as the operating standard.

Existing code, docs, skills, data tooling, and architecture are not automatically final. They are also not automatically discarded.

For each existing part, classify it as:

1. Keep as-is
    Useful, safe, understandable, and compatible enough.
2. Keep with cleanup
    Mostly works but needs local improvement.
3. Refactor
    Directionally useful but blocks the new product direction or maintainability.
4. Replace
    Creates safety, privacy, cost, deployment, data-quality, maintainability, or architectural risk.

Favor the smallest useful refactor that makes the next phase solid.

11. Data Model Direction

11.1 Holiday Record

type HolidayRecord = {
  id: string;
  stateCode: GermanStateCode;
  scope: "national" | "state" | "regional";
  type: "public_holiday" | "school_holiday";
  name: {
    de: string;
    en?: string;
    zh?: string;
  };
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD, inclusive
  year: number;
  sourceRefs: string[];
};

11.2 Planning Event Record

Use neutral naming. Do not call this ImpactEvent unless there is a strong reason.

type PlanningEventRecord = {
  id: string;
  city: "berlin";
  stateCode: "BE";
  category:
    | "trade_fair"
    | "major_sport"
    | "marathon"
    | "large_public_event";
  title: {
    de: string;
    en?: string;
    zh?: string;
  };
  startDate: string;
  endDate: string;
  venue?: string;
  district?: string;
  planningSignals?: {
    hotelDemand?: "low" | "medium" | "high" | "unknown";
    crowdLevel?: "low" | "medium" | "high" | "unknown";
    trafficChanges?: "none" | "possible" | "likely" | "confirmed" | "unknown";
    roadClosures?: "none" | "possible" | "likely" | "confirmed" | "unknown";
  };
  userIntentTags?: Array<
    | "attend"
    | "avoid_crowds"
    | "family_trip"
    | "business_trip"
    | "city_travel"
  >;
  sourceRefs: string[];
  confidence: "official" | "cross_checked" | "manual_unverified";
};

11.3 Frontend Calendar Index

The public frontend should preferably consume a frontend-friendly generated index.

Example direction:

type CalendarDayIndex = {
  date: string;
  holidaysByState: Record<
    GermanStateCode,
    {
      publicHolidayIds: string[];
      schoolHolidayIds: string[];
    }
  >;
  planningEventIds?: string[];
};

This helps keep frontend filtering and rendering simple.

12. Frontend UX Direction

Use a clean, practical, mobile-first design.

Main page goal:

Help users quickly browse, compare, and understand holidays and major events for a selected time period and region selection.

Recommended layout:

Desktop

Header
Filter panel
Calendar / comparison view
Date detail panel
Legend

Mobile

Header
Compact filter controls
Calendar
Bottom sheet date details
Legend / help text

Required controls:

* locale selector or locale route
* year selector
* month/quarter selector
* region mode:
    * all Germany
    * one state
    * multiple states
* state selector
* data layers:
    * public holidays
    * school holidays
    * major events
* view mode if useful:
    * calendar
    * list
    * comparison

Required UI states:

* loading
* empty period
* no states selected
* no holidays/events for selected date
* invalid filter combination
* data unavailable
* event source confidence unknown
* mobile overflow behavior

Accessibility baseline:

* semantic controls
* visible focus
* not color-only signals
* readable contrast
* keyboard usable filters
* clear labels and helper text

13. Internationalization

Maintain three public UI languages:

* Chinese
* German
* English

Locale routes should remain explicit if already used:

/zh
/de
/en

All user-facing labels should support translation.

Event and holiday names should prefer source language where appropriate, with optional translations.

14. Deployment

Deployment target:

Cloudflare Pages free tier

Only apps/web is deployed.

Data Studio is never deployed.

Generated JSON is part of the static public app output.

No server runtime is required for public use.

15. Data Workflow

Data is mostly static and can be updated manually or semi-manually.

General flow:

official/public sources
  -> local fetch/import
  -> normalize
  -> validate
  -> diff/review
  -> publish generated JSON
  -> static frontend consumes JSON

Manual refresh/review/publish should remain possible.

The public frontend must never fetch upstream official sources directly.

16. Major Events Layer

Initial scope:

Berlin only

Initial categories:

trade fairs
major sports events
marathons

Events should be shown neutrally.

Planning signals are optional, not the main product identity.

Examples of planning signals:

* hotel demand may be higher
* crowd level may be higher
* traffic changes possible
* road closures possible

The UI should avoid presenting events as purely negative. It should support both:

* users who want to attend
* users who want to avoid or plan around the event

17. TanStack Skill Direction

A project-local TanStack skill may be useful before frontend refactoring.

It should cover:

* TanStack Router static frontend
* Vite static build
* generated JSON loading
* route/search-param-based filters
* locale routes
* mobile-first route/page structure
* no deployed server functions
* TanStack Start only for local Data Studio if retained
* docs-first-research for version/API-specific behavior

This skill should support this project’s constraints. It should not be a generic TanStack tutorial.

18. Success Criteria

MVP is successful when:

* public frontend can be statically built
* frontend can show holiday data from generated JSON
* user can select all Germany, one state, or multiple states
* user can filter by month and quarter
* overlapping holidays across selected states are visually clear
* date details are understandable
* mobile layout is usable
* no backend runtime is needed
* no paid API or secret is introduced
* local data workflow remains possible
* architecture has a clear extension path for Berlin major events

19. Recommended First Implementation Focus

Do not start with Berlin events.

First focus:

Product Scope Reset + Frontend Holiday Explorer Refactor

Then:

Berlin Major Events Layer

Recommended first engineering goal:

Create a foundation-kit-guided refactor plan that inspects the existing project, classifies existing parts as keep / cleanup / refactor / replace, and defines the smallest useful implementation path for the deployable frontend.
