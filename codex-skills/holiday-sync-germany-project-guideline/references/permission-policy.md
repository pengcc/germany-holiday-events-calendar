# Permission Policy

## Default

Work locally, keep recurring cost at zero, and avoid external services unless explicitly approved.

## Allowed With Normal Care

- Installing open-source dependencies needed by an approved plan.
- Reading official documentation and npm registry metadata.
- Fetching public/official holiday data in local tooling when the task is explicitly about data updates.

## Requires Explicit Confirmation

- Any paid or metered API.
- Any API key, secret, hosted database, analytics, telemetry, geocoding, map, monitoring, or enrichment service.
- Any backend runtime or scheduled hosted job.
- Any change that collects, stores, or transmits personal data.
- Any deployment or publish workflow before the remote repository and hosting target are confirmed.

## Data Source Rule

External holiday data may be collected only into a local review workflow first. It must not flow directly into publishable static data without validation and human review.

The approved quarterly GitHub source monitor is read-only with respect to repository data. It may
open or update an Issue about reachability, fingerprints, or review dates, but it may not commit
data, open data pull requests, or deploy.
