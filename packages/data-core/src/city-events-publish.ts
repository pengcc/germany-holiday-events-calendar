import {
  type AcceptedCityEventSourceFact,
  AcceptedCityEventSourceFactSchema,
  type CityCode,
  type CityEventCurationSet,
  CityEventCurationSetSchema,
  type CityEventSource,
  type CityEventSourceCoverage,
  CityEventSourceCoverageSchema,
  type CityEventsManifest,
  CityEventsManifestSchema,
  type PublishedCityEvent,
  type PublishedCityEvents,
  PublishedCityEventsSchema,
} from "./city-events-schemas";

export const CITY_EVENTS_OFFICIAL_SOURCE_DISCLAIMER =
  "Event dates are based on selected official sources and may change. Verify the linked official source before making travel, hotel, booking, or business decisions.";

export type BuildPublishedCityEventsDatasetInput = {
  acceptedFacts: AcceptedCityEventSourceFact[];
  curationSet: CityEventCurationSet;
  datasetVersion: string;
  generatedAt: string;
  recordsSha256: string;
  sourceCoverage: CityEventSourceCoverage[];
  warnings: string[];
};

export type BuildPublishedCityEventsDatasetResult = {
  dataset: PublishedCityEvents;
  manifest: CityEventsManifest;
};

export function buildPublishedCityEventsDataset(
  input: BuildPublishedCityEventsDatasetInput,
): BuildPublishedCityEventsDatasetResult {
  const acceptedFacts = input.acceptedFacts.map((fact) =>
    AcceptedCityEventSourceFactSchema.parse(fact),
  );
  const curationSet = CityEventCurationSetSchema.parse(input.curationSet);
  const sourceCoverage = input.sourceCoverage.map((coverage) =>
    CityEventSourceCoverageSchema.parse(coverage),
  );

  assertUniqueAcceptedFacts(acceptedFacts);

  const acceptedIds = new Set(acceptedFacts.map((fact) => fact.event.id));
  const curationsByEventId = new Map(
    curationSet.curations.map((curation) => [curation.eventId, curation]),
  );

  for (const eventId of curationsByEventId.keys()) {
    if (!acceptedIds.has(eventId)) {
      throw new Error(`Curation references unknown city event id: ${eventId}`);
    }
  }

  const coveragePairs = new Set(
    sourceCoverage.map((coverage) => sourceCityKey(coverage.source, coverage.city)),
  );
  const visibleRecords: PublishedCityEvent[] = [];

  for (const fact of acceptedFacts) {
    const curation = curationsByEventId.get(fact.event.id);
    if (!curation) {
      throw new Error(`Accepted city event is missing explicit curation: ${fact.event.id}`);
    }
    const coveragePair = sourceCityKey(fact.event.source, fact.event.city);
    if (!coveragePairs.has(coveragePair)) {
      throw new Error(`Accepted city event has no source coverage entry: ${coveragePair}`);
    }
    if (curation.hidden) {
      continue;
    }

    visibleRecords.push({
      id: fact.event.id,
      source: fact.event.source,
      category: fact.event.category,
      title: fact.event.title,
      startDate: fact.event.startDate,
      endDate: fact.event.endDate,
      city: fact.event.city,
      ...(fact.event.venue === undefined ? {} : { venue: fact.event.venue }),
      sourceUrl: fact.event.sourceUrl,
      impactLevel: curation.impactLevel,
    });
  }

  visibleRecords.sort(comparePublishedCityEvents);

  const publishedCounts = new Map<string, number>();
  for (const record of visibleRecords) {
    const key = sourceCityKey(record.source, record.city);
    publishedCounts.set(key, (publishedCounts.get(key) ?? 0) + 1);
  }

  const normalizedSourceCoverage = sourceCoverage
    .map((coverage) => ({
      ...coverage,
      publishedRecordCount: publishedCounts.get(sourceCityKey(coverage.source, coverage.city)) ?? 0,
    }))
    .sort(compareSourceCoverage);

  const dataset = PublishedCityEventsSchema.parse({
    schemaVersion: 1,
    records: visibleRecords,
  });
  const warnings = input.warnings.includes(CITY_EVENTS_OFFICIAL_SOURCE_DISCLAIMER)
    ? [...input.warnings]
    : [...input.warnings, CITY_EVENTS_OFFICIAL_SOURCE_DISCLAIMER];
  const manifest = CityEventsManifestSchema.parse({
    schemaVersion: 1,
    datasetVersion: input.datasetVersion,
    generatedAt: input.generatedAt,
    recordsFile: "city-events.json",
    recordsSha256: input.recordsSha256,
    recordCount: dataset.records.length,
    coverageKind: "selected_official_sources",
    coveredCities: [...new Set(normalizedSourceCoverage.map((coverage) => coverage.city))].sort(),
    coveredSources: [
      ...new Set(normalizedSourceCoverage.map((coverage) => coverage.source)),
    ].sort(),
    sourceCoverage: normalizedSourceCoverage,
    warnings,
  });

  return { dataset, manifest };
}

function assertUniqueAcceptedFacts(acceptedFacts: AcceptedCityEventSourceFact[]): void {
  const eventIds = new Set<string>();
  const sourceEventKeys = new Set<string>();

  for (const fact of acceptedFacts) {
    if (eventIds.has(fact.event.id)) {
      throw new Error(`Duplicate accepted city event id: ${fact.event.id}`);
    }
    eventIds.add(fact.event.id);

    const sourceEventKey = `${fact.event.source}:${fact.event.sourceEventKey}`;
    if (sourceEventKeys.has(sourceEventKey)) {
      throw new Error(`Duplicate accepted source event key: ${sourceEventKey}`);
    }
    sourceEventKeys.add(sourceEventKey);
  }
}

function comparePublishedCityEvents(left: PublishedCityEvent, right: PublishedCityEvent): number {
  return (
    left.startDate.localeCompare(right.startDate) ||
    left.endDate.localeCompare(right.endDate) ||
    left.source.localeCompare(right.source) ||
    left.id.localeCompare(right.id)
  );
}

function compareSourceCoverage(
  left: CityEventSourceCoverage,
  right: CityEventSourceCoverage,
): number {
  return left.source.localeCompare(right.source) || left.city.localeCompare(right.city);
}

function sourceCityKey(source: CityEventSource, city: CityCode): string {
  return `${source}:${city}`;
}
