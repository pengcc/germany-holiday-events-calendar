import { describe, expect, it } from "vitest";
import {
  AcceptedCityEventSourceFactSchema,
  CityEventCurationSchema,
  CityEventCurationSetSchema,
  CityEventsManifestSchema,
  cityEventCategoryBySource,
  getCityEventCategoryForSource,
  ImportedCityEventSchema,
  PublishedCityEventSchema,
  PublishedCityEventsSchema,
} from "./city-events-schemas";

const importedEvent = {
  id: "city-event:scc_events:SCCEVENTS-EVENT-41916-0",
  sourceEventKey: "SCCEVENTS-EVENT-41916-0",
  source: "scc_events",
  category: "sport",
  title: "Berlin Marathon 2026",
  startDate: "2026-09-27",
  endDate: "2026-09-27",
  city: "berlin",
  venue: "Berlin",
  sourceUrl: "https://www.scc-events.com/veranstaltungen/berlin-marathon",
} as const;

const publishedEvent = {
  id: importedEvent.id,
  source: importedEvent.source,
  category: importedEvent.category,
  title: importedEvent.title,
  startDate: importedEvent.startDate,
  endDate: importedEvent.endDate,
  city: importedEvent.city,
  venue: importedEvent.venue,
  sourceUrl: importedEvent.sourceUrl,
  impactLevel: "none",
} as const;

const manifest = {
  schemaVersion: 1,
  datasetVersion: "city-events-v1",
  generatedAt: "2026-07-03T12:00:00.000Z",
  recordsFile: "city-events.json",
  recordsSha256: "a".repeat(64),
  recordCount: 1,
  coverageKind: "selected_official_sources",
  coveredCities: ["berlin"],
  coveredSources: ["scc_events"],
  sourceCoverage: [
    {
      source: "scc_events",
      city: "berlin",
      status: "covered",
      retrievedAt: "2026-07-03T10:00:00.000Z",
      sourceUpdatedAt: "2026-07-02T10:00:00.000Z",
      reviewedAt: "2026-07-03T11:00:00.000Z",
      reviewStatus: "current",
      reviewPolicyVersion: "city-events-v1",
      stale: false,
      publishedRecordCount: 1,
      warnings: [],
    },
  ],
  warnings: [],
} as const;

const acceptedFact = {
  schemaVersion: 1,
  event: importedEvent,
  evidenceCheckedAt: "2026-07-03T10:00:00.000Z",
  review: {
    reviewedAt: "2026-07-03T11:00:00.000Z",
    reviewer: "Internal reviewer",
    rationale: "Dates and official URL checked against the source page.",
  },
} as const;

describe("city event schemas", () => {
  it("validates imported source facts and the source-owned category mapping", () => {
    expect(ImportedCityEventSchema.parse(importedEvent)).toEqual(importedEvent);
    expect(getCityEventCategoryForSource("messe_berlin")).toBe("trade_fair");
    expect(getCityEventCategoryForSource("scc_events")).toBe("sport");
    expect(getCityEventCategoryForSource("berlinale")).toBe("major_culture");
    expect(cityEventCategoryBySource).toEqual({
      messe_berlin: "trade_fair",
      scc_events: "sport",
      berlinale: "major_culture",
      karneval_der_kulturen: "major_culture",
      festival_of_lights: "major_culture",
      csd_berlin: "major_culture",
    });
  });

  it("rejects source/category mismatches", () => {
    expect(
      ImportedCityEventSchema.safeParse({ ...importedEvent, category: "trade_fair" }).success,
    ).toBe(false);
    expect(
      PublishedCityEventSchema.safeParse({ ...publishedEvent, category: "trade_fair" }).success,
    ).toBe(false);
  });

  it("rejects invalid calendar dates and reversed ranges", () => {
    expect(
      ImportedCityEventSchema.safeParse({ ...importedEvent, startDate: "2026-02-30" }).success,
    ).toBe(false);
    expect(
      ImportedCityEventSchema.safeParse({ ...importedEvent, startDate: "27-09-2026" }).success,
    ).toBe(false);
    expect(
      ImportedCityEventSchema.safeParse({
        ...importedEvent,
        startDate: "2026-09-28",
        endDate: "2026-09-27",
      }).success,
    ).toBe(false);
  });

  it("requires HTTPS source URLs", () => {
    expect(
      ImportedCityEventSchema.safeParse({
        ...importedEvent,
        sourceUrl: "http://www.scc-events.com/event",
      }).success,
    ).toBe(false);
  });

  it("requires explicit curation state and rejects v1 impact note overrides", () => {
    expect(
      CityEventCurationSchema.parse({
        eventId: importedEvent.id,
        impactLevel: "high",
        hidden: false,
      }),
    ).toEqual({ eventId: importedEvent.id, impactLevel: "high", hidden: false });
    expect(
      CityEventCurationSchema.safeParse({ eventId: importedEvent.id, hidden: false }).success,
    ).toBe(false);
    expect(
      CityEventCurationSchema.safeParse({
        eventId: importedEvent.id,
        impactLevel: "none",
      }).success,
    ).toBe(false);
    expect(
      CityEventCurationSchema.safeParse({
        eventId: importedEvent.id,
        impactLevel: "none",
        hidden: false,
        impactNoteOverride: "Not part of v1",
      }).success,
    ).toBe(false);
  });

  it("validates internal accepted facts and keeps review metadata internal", () => {
    expect(AcceptedCityEventSourceFactSchema.parse(acceptedFact)).toEqual(acceptedFact);
    expect(
      AcceptedCityEventSourceFactSchema.safeParse({
        ...acceptedFact,
        event: { ...importedEvent, category: "trade_fair" },
      }).success,
    ).toBe(false);
    expect(
      AcceptedCityEventSourceFactSchema.safeParse({
        ...acceptedFact,
        event: { ...importedEvent, sourceUrl: "http://www.scc-events.com/event" },
      }).success,
    ).toBe(false);
    expect(
      AcceptedCityEventSourceFactSchema.safeParse({
        ...acceptedFact,
        evidenceCheckedAt: "2026-07-03",
      }).success,
    ).toBe(false);
    expect(
      AcceptedCityEventSourceFactSchema.safeParse({
        ...acceptedFact,
        review: { ...acceptedFact.review, reviewedAt: "not-a-datetime" },
      }).success,
    ).toBe(false);
  });

  it("rejects duplicate curation ids and v1 impact note overrides in curation sets", () => {
    const curation = { eventId: importedEvent.id, impactLevel: "none", hidden: false } as const;
    expect(CityEventCurationSetSchema.parse({ schemaVersion: 1, curations: [curation] })).toEqual({
      schemaVersion: 1,
      curations: [curation],
    });
    expect(
      CityEventCurationSetSchema.safeParse({
        schemaVersion: 1,
        curations: [curation, curation],
      }).success,
    ).toBe(false);
    expect(
      CityEventCurationSetSchema.safeParse({
        schemaVersion: 1,
        curations: [{ ...curation, impactNoteOverride: "Not part of v1" }],
      }).success,
    ).toBe(false);
  });

  it("keeps internal and curation fields out of published records", () => {
    expect(PublishedCityEventSchema.parse(publishedEvent)).toEqual(publishedEvent);
    expect(
      PublishedCityEventSchema.safeParse({ ...publishedEvent, sourceEventKey: "internal" }).success,
    ).toBe(false);
    expect(PublishedCityEventSchema.safeParse({ ...publishedEvent, hidden: false }).success).toBe(
      false,
    );
    expect(
      PublishedCityEventSchema.safeParse({ ...publishedEvent, reviewer: "Internal person" })
        .success,
    ).toBe(false);
    expect(
      PublishedCityEventSchema.safeParse({
        ...publishedEvent,
        impactNoteOverride: { zh: "高", de: "Hoch", en: "High" },
      }).success,
    ).toBe(false);
  });

  it("rejects duplicate published event ids", () => {
    expect(
      PublishedCityEventsSchema.safeParse({
        schemaVersion: 1,
        records: [publishedEvent, publishedEvent],
      }).success,
    ).toBe(false);
  });

  it("validates the public manifest literals, coverage, and counts", () => {
    expect(CityEventsManifestSchema.parse(manifest)).toEqual(manifest);
    expect(
      CityEventsManifestSchema.safeParse({ ...manifest, recordsFile: "events.json" }).success,
    ).toBe(false);
    expect(
      CityEventsManifestSchema.safeParse({ ...manifest, coverageKind: "all_events" }).success,
    ).toBe(false);
    expect(
      CityEventsManifestSchema.safeParse({
        ...manifest,
        coveredSources: ["unknown_source"],
      }).success,
    ).toBe(false);
    expect(
      CityEventsManifestSchema.safeParse({
        ...manifest,
        sourceCoverage: [{ ...manifest.sourceCoverage[0], publishedRecordCount: -1 }],
      }).success,
    ).toBe(false);
    expect(
      CityEventsManifestSchema.safeParse({
        ...manifest,
        sourceCoverage: [{ ...manifest.sourceCoverage[0], reviewStatus: "approved" }],
      }).success,
    ).toBe(false);
  });

  it("rejects duplicate and inconsistent public manifest coverage", () => {
    expect(
      CityEventsManifestSchema.safeParse({
        ...manifest,
        coveredSources: ["scc_events", "scc_events"],
      }).success,
    ).toBe(false);
    expect(
      CityEventsManifestSchema.safeParse({
        ...manifest,
        coveredCities: ["berlin", "berlin"],
      }).success,
    ).toBe(false);
    expect(
      CityEventsManifestSchema.safeParse({
        ...manifest,
        coveredSources: ["messe_berlin"],
      }).success,
    ).toBe(false);
    expect(
      CityEventsManifestSchema.safeParse({
        ...manifest,
        coveredSources: ["scc_events", "messe_berlin"],
      }).success,
    ).toBe(false);
    expect(
      CityEventsManifestSchema.safeParse({
        ...manifest,
        coveredCities: [],
      }).success,
    ).toBe(false);
    expect(
      CityEventsManifestSchema.safeParse({
        ...manifest,
        recordCount: 0,
        coveredSources: [],
        sourceCoverage: [],
      }).success,
    ).toBe(false);
    expect(
      CityEventsManifestSchema.safeParse({
        ...manifest,
        sourceCoverage: [manifest.sourceCoverage[0], manifest.sourceCoverage[0]],
        recordCount: 2,
      }).success,
    ).toBe(false);
    expect(CityEventsManifestSchema.safeParse({ ...manifest, recordCount: 2 }).success).toBe(false);
  });

  it("rejects public reviewer identity and reviewBy metadata", () => {
    expect(CityEventsManifestSchema.safeParse({ ...manifest, reviewer: "Person" }).success).toBe(
      false,
    );
    expect(
      CityEventsManifestSchema.safeParse({
        ...manifest,
        sourceCoverage: [{ ...manifest.sourceCoverage[0], reviewBy: "2026-12-31" }],
      }).success,
    ).toBe(false);
    expect(
      CityEventsManifestSchema.safeParse({
        ...manifest,
        sourceCoverage: [{ ...manifest.sourceCoverage[0], reviewerEmail: "person@example.com" }],
      }).success,
    ).toBe(false);
  });
});
