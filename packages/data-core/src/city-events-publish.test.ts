import { describe, expect, it } from "vitest";
import {
  type BuildPublishedCityEventsDatasetInput,
  buildPublishedCityEventsDataset,
  CITY_EVENTS_OFFICIAL_SOURCE_DISCLAIMER,
} from "./city-events-publish";
import {
  type CityEventSourceCoverage,
  CityEventsManifestSchema,
  PublishedCityEventsSchema,
} from "./city-events-schemas";

const sourceCoverage: CityEventSourceCoverage = {
  source: "scc_events",
  city: "berlin",
  status: "manual",
  retrievedAt: "2026-07-03T10:00:00.000Z",
  reviewedAt: "2026-07-03T11:00:00.000Z",
  reviewStatus: "current",
  reviewPolicyVersion: "city-events-v1",
  stale: false,
  publishedRecordCount: 99,
  warnings: [],
};

function acceptedFact(id: string, sourceEventKey: string, startDate: string, endDate = startDate) {
  return {
    schemaVersion: 1 as const,
    event: {
      id,
      sourceEventKey,
      source: "scc_events" as const,
      category: "sport" as const,
      title: `Official event ${id}`,
      startDate,
      endDate,
      city: "berlin" as const,
      sourceUrl: `https://www.scc-events.com/events/${sourceEventKey}`,
    },
    evidenceCheckedAt: "2026-07-03T10:00:00.000Z",
    review: {
      reviewedAt: "2026-07-03T11:00:00.000Z",
      reviewer: "Internal reviewer",
      rationale: "Minimal official facts checked.",
    },
  };
}

function buildInput(): BuildPublishedCityEventsDatasetInput {
  const visible = acceptedFact("city-event:scc:visible", "visible", "2026-09-27");
  const hidden = acceptedFact("city-event:scc:hidden", "hidden", "2026-09-26");
  return {
    acceptedFacts: [visible, hidden],
    curationSet: {
      schemaVersion: 1 as const,
      curations: [
        { eventId: visible.event.id, impactLevel: "high" as const, hidden: false },
        { eventId: hidden.event.id, impactLevel: "none" as const, hidden: true },
      ],
    },
    datasetVersion: "city-events-v1",
    generatedAt: "2026-07-03T12:00:00.000Z",
    recordsSha256: "a".repeat(64),
    sourceCoverage: [sourceCoverage],
    warnings: [],
  };
}

describe("buildPublishedCityEventsDataset", () => {
  it("builds validated public records and manifest without internal fields", () => {
    const result = buildPublishedCityEventsDataset(buildInput());

    expect(PublishedCityEventsSchema.parse(result.dataset)).toEqual(result.dataset);
    expect(CityEventsManifestSchema.parse(result.manifest)).toEqual(result.manifest);
    expect(result.dataset.records).toHaveLength(1);
    expect(result.dataset.records[0]).toMatchObject({
      id: "city-event:scc:visible",
      impactLevel: "high",
    });
    expect(result.dataset.records[0]).not.toHaveProperty("sourceEventKey");
    expect(result.dataset.records[0]).not.toHaveProperty("hidden");
    expect(result.dataset.records[0]).not.toHaveProperty("reviewer");
    expect(result.dataset.records[0]).not.toHaveProperty("rationale");
    expect(result.dataset.records[0]).not.toHaveProperty("impactNoteOverride");
    expect(result.manifest.recordCount).toBe(1);
    expect(result.manifest.sourceCoverage[0]?.publishedRecordCount).toBe(1);
    expect(result.manifest.warnings).toContain(CITY_EVENTS_OFFICIAL_SOURCE_DISCLAIMER);
  });

  it("rejects accepted events without curation and curations for unknown events", () => {
    const missingCuration = buildInput();
    missingCuration.curationSet.curations.pop();
    expect(() => buildPublishedCityEventsDataset(missingCuration)).toThrow(
      "Accepted city event is missing explicit curation",
    );

    const unknownCuration = buildInput();
    unknownCuration.curationSet.curations.push({
      eventId: "city-event:scc:unknown",
      impactLevel: "none",
      hidden: false,
    });
    expect(() => buildPublishedCityEventsDataset(unknownCuration)).toThrow(
      "Curation references unknown city event id",
    );
  });

  it("rejects duplicate accepted ids and source event keys", () => {
    const duplicateId = buildInput();
    duplicateId.acceptedFacts[1] = acceptedFact(
      duplicateId.acceptedFacts[0].event.id,
      "other-key",
      "2026-09-28",
    );
    duplicateId.curationSet.curations = [duplicateId.curationSet.curations[0]];
    expect(() => buildPublishedCityEventsDataset(duplicateId)).toThrow(
      "Duplicate accepted city event id",
    );

    const duplicateSourceKey = buildInput();
    duplicateSourceKey.acceptedFacts[1] = acceptedFact(
      "city-event:scc:other-id",
      duplicateSourceKey.acceptedFacts[0].event.sourceEventKey,
      "2026-09-28",
    );
    duplicateSourceKey.curationSet.curations[1].eventId = "city-event:scc:other-id";
    expect(() => buildPublishedCityEventsDataset(duplicateSourceKey)).toThrow(
      "Duplicate accepted source event key",
    );
  });

  it("sorts records deterministically by date range, source, and id", () => {
    const input = buildInput();
    const first = acceptedFact("city-event:scc:b", "b", "2026-08-01", "2026-08-02");
    const second = acceptedFact("city-event:scc:a", "a", "2026-08-01", "2026-08-01");
    input.acceptedFacts = [first, second];
    input.curationSet.curations = [first, second].map((fact) => ({
      eventId: fact.event.id,
      impactLevel: "none" as const,
      hidden: false,
    }));

    expect(
      buildPublishedCityEventsDataset(input).dataset.records.map((record) => record.id),
    ).toEqual(["city-event:scc:a", "city-event:scc:b"]);
  });

  it("rejects accepted facts without matching source coverage", () => {
    const input = buildInput();
    input.sourceCoverage = [];
    expect(() => buildPublishedCityEventsDataset(input)).toThrow(
      "Accepted city event has no source coverage entry",
    );
  });
});
