import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse } from "yaml";
import {
  type HolidayOverride,
  OverrideSchema,
  type SourceManifest,
  SourceManifestSchema,
} from "./schemas";

export async function loadSourceManifests(directory: string): Promise<SourceManifest[]> {
  const files = (await readdir(directory))
    .filter((file) => file.endsWith(".yaml") || file.endsWith(".yml"))
    .sort();
  return Promise.all(
    files.map(async (file) =>
      SourceManifestSchema.parse(parse(await readFile(resolve(directory, file), "utf8"))),
    ),
  );
}

export async function loadOverrides(directory: string): Promise<HolidayOverride[]> {
  let files: string[];
  try {
    files = (await readdir(directory))
      .filter((file) => file.endsWith(".yaml") || file.endsWith(".yml"))
      .sort();
  } catch {
    return [];
  }

  return Promise.all(
    files.map(async (file) =>
      OverrideSchema.parse(parse(await readFile(resolve(directory, file), "utf8"))),
    ),
  );
}
