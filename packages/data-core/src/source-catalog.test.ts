import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { projectPaths } from "./fs";
import { loadSourceManifests } from "./manifests";
import { generatePublicHolidays, loadPublicHolidayRules } from "./public-holidays";
import { stateCodes } from "./schemas";

const workspaceRoot = resolve(import.meta.dirname, "../../..");

describe("official source catalog", () => {
  it("defines all 80 required state and period batches", async () => {
    const paths = projectPaths(workspaceRoot);
    const sources = await loadSourceManifests(paths.sources);

    expect(sources).toHaveLength(80);
    expect(sources.filter((source) => source.category === "school")).toHaveLength(48);
    expect(sources.filter((source) => source.category === "public")).toHaveLength(32);
    for (const jurisdiction of stateCodes) {
      expect(sources.filter((source) => source.jurisdiction === jurisdiction)).toHaveLength(5);
    }
  });

  it("generates public holiday records for every state and target year", async () => {
    const paths = projectPaths(workspaceRoot);
    const [sources, rules] = await Promise.all([
      loadSourceManifests(paths.sources),
      loadPublicHolidayRules(paths.publicRules),
    ]);
    const publicSources = sources.filter((source) => source.category === "public");

    for (const source of publicSources) {
      const records = generatePublicHolidays(source, rules);
      expect(records.length, source.id).toBeGreaterThanOrEqual(10);
      expect(records.every((record) => record.names.de && record.names.en && record.names.zh)).toBe(
        true,
      );
    }
  });
});
