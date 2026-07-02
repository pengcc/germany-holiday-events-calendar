# Holiday Explorer PRD

## 1. Product Overview

### 1.1 Purpose

Holiday Explorer helps people understand German public holidays and school holidays in the
federal states that matter to them. It supports both direct lookup and cross-state comparison.

Holiday Explorer is not simply a “show all Germany holidays” calendar. Users primarily come to
the page to answer two questions:

1. When does the federal state I care about have public holidays or school holidays?
2. Which holiday dates overlap across multiple selected federal states?

These questions require different behavior. The public frontend must distinguish a lookup mode
from a comparison mode instead of presenting state-selection mechanics as if they were the user’s
goal.

### 1.2 Product Framing

Holiday Explorer is the public, static holiday-browsing frontend within Germany Holiday & Events
Calendar. It presents reviewed published data for planning and comparison. It does not fetch,
review, edit, approve, or publish holiday data.

The primary experience is organized around three view modes derived from the two user questions:

1. **One federal state** — look up public holidays and school holidays for one selected state.
2. **Nationwide common holidays** — find public holidays shared by all 16 federal states.
3. **Compare multiple federal states** — compare holiday overlap across 2–16 selected states.

The default view mode is **One federal state** because checking the calendar for a state is the
most common and direct lookup task.

### 1.3 Relationship to Earlier Product Documents

[`docs/product-prd.md`](product-prd.md) remains historical and reference material. It is useful for
the broader product direction, established project boundaries, static frontend architecture, and
post-MVP event framing, but it is not modified by this refinement.

This document defines the current product framing for public Holiday Explorer view-mode behavior.
Where `docs/product-prd.md` or other earlier product material uses ambiguous public-frontend terms
such as “Germany-wide,” “all Germany,” “region scope,” “one federal state,” or “multiple federal
states,” this document clarifies and supersedes that wording for Holiday Explorer view modes.

This refinement does not supersede or change data workflow, Data Studio, schema, review,
publishing, release-readiness, deployment, or generated-data rules. Data Studio remains governed
by separate data workflow documentation and is not affected by this public frontend view-mode
design.

### 1.4 Page Goal and User Decisions

The page should let users quickly decide:

- which dates have relevant public or school holiday activity for one state;
- which public holidays are genuinely common to all 16 states;
- which dates provide shared holiday activity across a chosen group of states; and
- which holiday records explain a selected date.

Filters for year, period, and holiday type support these decisions. They do not replace the view
mode. The view mode establishes the user’s question and determines valid state selection, layer
availability, overlap presentation, coverage messaging, and legend explanation.

## 2. View Modes

### 2.1 View Mode A: One Federal State

**User question:** “I want to see public holidays and school holidays for one state.”

**Suggested helper copy:** “View public holidays and school holidays for one selected federal
state.”

Behavior:

- The user selects exactly one federal state.
- The calendar shows reviewed holidays applicable to that state and the active filters.
- Public holidays and school holidays may both be enabled.
- Overlap fractions such as `1/1`, `1/16`, or `2/16` are not shown because this mode does not
  compare states.
- Selecting a date shows the concrete holiday names, types, applicability, date ranges, states,
  and available source references in date details.

Calendar semantics:

- Yellow date background: the date includes a public holiday.
- Green date background: the date has school holiday activity only.
- White date background: no reviewed holiday activity matches the selected state and filters.
- Circle and diamond markers identify public and school holiday types when present.

### 2.2 View Mode B: Nationwide Common Holidays

**User question:** “Which public holidays apply in all 16 German federal states?”

**Suggested helper copy:** “Show only public holidays that apply in all 16 federal states.”

Behavior:

- All 16 federal states are implicit; users do not select states individually in this mode.
- The calendar shows only statewide public holidays that apply in every federal state on the
  date.
- Regional or otherwise limited-applicability public holidays do not count toward a
  nationwide-common result, even when records exist for the date.
- This mode means “all states share this public holiday date,” not “show every holiday in
  Germany.”
- School holidays are hidden or disabled because they are state-level schedules and are not a
  natural nationwide-common query.
- `16/16` fractions are hidden or deemphasized because the mode name already communicates the
  nationwide condition.
- Date details may state “Applies to all 16 federal states.”

This mode must not become a general “all holidays in Germany” view. A future state overview or
table-based view may support that separate need, but it is not part of this MVP framework.

### 2.3 View Mode C: Compare Multiple Federal States

**User question:** “I want to compare holiday overlap across two or more states.”

**Suggested helper copy:** “Select 2–16 federal states and compare overlapping public holidays and
school holidays.”

Typical use cases include:

- family members living in different states;
- friends, clubs, or groups planning shared free days;
- comparing school holiday overlap; and
- finding dates when every selected state has holiday activity.

Behavior:

- The user selects 2–16 federal states.
- Users can check and uncheck states, including states that are already selected.
- Fewer than two selected states is an invalid comparison state. The UI shows a validation
  message rather than locking checkboxes or silently changing the user’s selection.
- Public holidays and school holidays may both be enabled.
- Overlap fractions appear only in this mode.
- Regional or otherwise limited-applicability public holidays may remain available in appropriate
  date details, but they must not make an entire state count toward statewide overlap.
- Date details identify the records and states contributing to the selected date.

Overlap semantics:

- `2/2`: all two selected states have holiday activity on that date.
- `1/2`: only one of the two selected states has holiday activity.
- `16/16`: all selected states have holiday activity when all 16 states are selected.
- In general, the numerator is the number of selected states with matching reviewed holiday
  activity and the denominator is the number of selected states.

## 3. Calendar Visual Semantics

The calendar legend must explain the visual elements users actually see. Background and marker
semantics are separate: backgrounds communicate the dominant day status, while markers preserve
holiday-type detail.

- **Yellow date background:** includes a public holiday.
- **Green date background:** school holiday activity only.
- **White date background:** no reviewed holiday activity for the selected view mode and filters.
- **Circle marker:** public holiday marker.
- **Diamond marker:** school holiday marker.
- **Fraction such as `2/2`:** overlap count, shown only in Compare multiple federal states.

If a date includes both public holiday and school holiday activity, the public holiday background
has priority, normally yellow. Markers and date details continue to indicate that both holiday
types are present.

Date numbers must remain clearly visible. Marker and fraction placement must not obscure the date
number. Full holiday names and explanations belong in accessible labels, the legend, and date
details rather than compact calendar badges.

### 3.1 Result-Focused Month Visibility

State, nationwide-common, and valid compare views show only months that contain normal holiday
activity under the current state, period, and holiday-layer filters. A regional-advisory-only
record does not make a month visible because it is not normal statewide/comparison activity.

When a valid view has no matching months, the UI shows a mode-specific empty-result state.
Compare mode with fewer than two selected states remains an explicit validation state rather than
a generic empty result. Manifest-derived coverage warnings remain visible independently of result
month visibility.

## 4. Data Coverage Warnings

Coverage warnings must reflect the active view mode and must not imply that an uncovered date has
no holiday. Warning state must be derived from the published manifest or equivalent coverage
metadata, not inferred only from the absence of holiday records.

### One Federal State

> The selected state or holiday type does not yet have fully reviewed published data. An empty
> date does not necessarily mean there is no holiday.

The warning is based only on the selected state, year/period, and enabled holiday types.

### Nationwide Common Holidays

> Some state/year public holiday data is not yet fully reviewed, so nationwide common holiday
> results may be incomplete.

This warning is important because a nationwide-common result requires adequate public-holiday
coverage across all 16 states.

### Compare Multiple Federal States

> Some selected states or holiday types do not yet have fully reviewed published data, so overlap
> results may be incomplete. An empty date does not necessarily mean there is no holiday.

The warning is based on the selected states, year/period, and enabled holiday types.

## 5. MVP Behavior Table

| View mode | State selection | School holiday toggle | Overlap fractions | Main purpose |
|---|---|---|---|---|
| One federal state | Exactly 1 state | Available | Hidden | Check holidays for one state |
| Nationwide common holidays | All 16 states implicitly | Hidden or disabled | Hidden or deemphasized | Check public holidays common to all states |
| Compare multiple federal states | 2–16 states | Available | Visible | Compare holiday overlap |

## 6. Current Product Problems This Design Solves

- “Germany-wide” is ambiguous and can be mistaken for “show all German holidays.”
- “Multiple federal states” describes a selection mechanism rather than the user’s comparison
  goal.
- Overlap fractions are confusing outside a comparison mode.
- Green and yellow backgrounds need explicit explanations tied to holiday meaning.
- Multi-state selection must allow users to uncheck selected states.
- The page needs a clear distinction between lookup mode and comparison mode.
- Coverage messaging needs to match the selected question instead of using one generic warning.
- School holidays need an explicit rule in a nationwide-common query.

## 7. Recommended Implementation Direction

A future implementation pull request should use a title such as:

> Clarify Holiday Explorer view modes and comparison behavior

Recommended implementation scope:

- begin with a data compatibility checkpoint covering published records, manifest coverage,
  statewide/regional applicability, and current frontend derivation; stop and define a separate
  data-layer follow-up if the frontend cannot represent these semantics honestly;
- rename “Region Scope” to “View Mode”;
- rename the modes to “One federal state,” “Nationwide common holidays,” and “Compare multiple
  federal states” in Chinese, German, and English;
- make One federal state the default mode;
- enforce exactly one selected state in One federal state;
- treat all 16 states as implicit in Nationwide common holidays;
- hide or disable school holidays in Nationwide common holidays;
- allow selected states to be unchecked in Compare multiple federal states;
- show validation when fewer than two states are selected for comparison;
- hide overlap fractions outside comparison mode;
- explain backgrounds, markers, and fractions through mode-appropriate legend text;
- provide mode-specific coverage warnings;
- preserve date selection, URL-backed state, filters, accessibility, and date details; and
- keep data, schema, publish/release logic, Data Studio, and generated files unchanged.

The implementation should remain a separate, reviewed plan and change set. This PRD does not
authorize or implement application changes.

## 8. Non-Goals

- No Data Studio changes.
- No data CLI changes.
- No data review workflow changes.
- No publish or release behavior changes.
- No schema changes.
- No generated data changes.
- No deployment behavior changes.
- No regional or special holiday data resolution.
- No broad visual redesign of the public frontend.
- No backend or admin tooling changes.
- No new dependency.
- No general “all holidays in Germany” aggregation view.
- No application implementation in this documentation task.

Data Studio remains governed by [`docs/data-workflow.md`](data-workflow.md) and related data
workflow documentation. It is not affected by this public frontend view-mode design.
