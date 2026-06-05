# Data Governance

## Source Records

Each source should record:

- Source name.
- Source URL.
- Terms/license note.
- Retrieval date.
- Raw snapshot path.
- Parsed output path.
- Diff/report path.
- Human review status.

## Data Contract Direction

The future static data contract should represent:

- German federal state.
- Year.
- Holiday type: public holiday or school holiday.
- Local all-day date or inclusive local date range.
- Localized holiday names where available.
- Source metadata.
- Generated overlap data.

## Review Policy

- Data scripts may fetch and parse sources locally.
- Generated reports must make additions, removals, and changed dates easy to inspect.
- Human review is required before publishable static JSON changes.
- Data refresh cadence is annual plus manual updates when sources change or issues are found.
