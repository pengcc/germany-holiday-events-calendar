# Data Governance

## Source Records

Each source should record:

- Source name.
- Source URL.
- Terms/license note.
- Retrieval date.
- Raw snapshot path when redistribution is allowed; otherwise local path plus content hash.
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
- Statewide, regional, or school-specific applicability.

## Review Policy

- Data scripts may fetch and parse sources locally.
- Generated reports must make additions, removals, and changed dates easy to inspect.
- Human review is required before publishable static JSON changes.
- Review one source, state, and school/calendar period as a batch.
- Date movement, deletion, scope ambiguity, official-source conflict, license changes, or expired
  data require an explicit recorded decision.
- Corrections use versioned overrides with rationale, evidence, scope, and review-by date.
- A failed batch retains its last accepted version while independent batches continue.
- Source-specific `reviewBy` dates control reuse; expired batches block publication.
- Data refreshes are low-frequency and manual. A quarterly read-only workflow may report source
  drift but must not write or publish data.
