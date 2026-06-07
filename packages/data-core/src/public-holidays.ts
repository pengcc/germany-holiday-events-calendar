import { readFile } from "node:fs/promises";
import { parseDate } from "@internationalized/date";
import { parse } from "yaml";
import { z } from "zod";
import type { HolidayRecord, SourceManifest, StateCode, ValidationIssue } from "./schemas";
import { IsoDateSchema, LocalizedNamesSchema, StateCodeSchema, stateCodes } from "./schemas";

const RuleDateSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("fixed"),
    month: z.number().int().min(1).max(12),
    day: z.number().int().min(1).max(31),
  }),
  z.object({
    kind: z.literal("easterOffset"),
    days: z.number().int().min(-100).max(100),
  }),
  z.object({
    kind: z.literal("weekdayBefore"),
    month: z.number().int().min(1).max(12),
    day: z.number().int().min(1).max(31),
    weekday: z.number().int().min(0).max(6),
  }),
]);

export const PublicHolidayRuleSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  names: LocalizedNamesSchema,
  jurisdictions: z.union([z.literal("all"), z.array(StateCodeSchema).min(1)]),
  scope: z.enum(["statewide", "regional"]),
  regions: z.array(z.string().min(1)).default([]),
  date: RuleDateSchema,
  validFrom: IsoDateSchema.optional(),
  validTo: IsoDateSchema.optional(),
  evidenceUrl: z.url().optional(),
  regionReviewStatus: z.enum(["verified", "requires-review"]).optional(),
});
export type PublicHolidayRule = z.infer<typeof PublicHolidayRuleSchema>;

const PublicHolidayRuleSetSchema = z.object({
  schemaVersion: z.literal(1),
  rules: z.array(PublicHolidayRuleSchema),
});

export async function loadPublicHolidayRules(path: string): Promise<PublicHolidayRule[]> {
  return PublicHolidayRuleSetSchema.parse(parse(await readFile(path, "utf8"))).rules;
}

export function generatePublicHolidays(
  source: SourceManifest,
  rules: PublicHolidayRule[],
): HolidayRecord[] {
  const year = Number(source.period.id);
  if (!Number.isInteger(year) || source.period.kind !== "calendarYear") {
    throw new Error(`Public holiday source ${source.id} must use a calendar-year period.`);
  }
  return rules
    .filter((rule) => appliesTo(rule, source.jurisdiction, year))
    .map((rule) => {
      const date = resolveRuleDate(rule.date, year);
      return {
        schemaVersion: 1 as const,
        id: `${source.id}:${rule.id}`,
        jurisdiction: source.jurisdiction,
        category: "public" as const,
        scope: rule.scope,
        regions: rule.regions,
        startDate: date,
        endDate: date,
        names: rule.names,
        periodId: source.period.id,
        source: {
          sourceId: source.id,
          sourceEventId: rule.id,
        },
      };
    })
    .sort(
      (left, right) =>
        left.startDate.localeCompare(right.startDate) || left.id.localeCompare(right.id),
    );
}

export function regionalRuleReviewIssues(
  source: SourceManifest,
  rules: PublicHolidayRule[],
): ValidationIssue[] {
  const year = Number(source.period.id);
  if (source.category !== "public" || !Number.isInteger(year)) {
    return [];
  }
  return rules
    .filter(
      (rule) =>
        rule.scope === "regional" &&
        rule.regionReviewStatus === "requires-review" &&
        appliesTo(rule, source.jurisdiction, year),
    )
    .map((rule) => ({
      code: "REGIONAL_SCOPE_REVIEW_REQUIRED",
      severity: "blocker" as const,
      stage: "validated" as const,
      sourceId: source.id,
      jurisdiction: source.jurisdiction,
      periodId: source.period.id,
      recordId: `${source.id}:${rule.id}`,
      message: `${rule.names.de} uses a regional municipality set that requires human verification.`,
      actual: rule.regions.join(", "),
      suggestedAction:
        "Check the official municipality list for the target year and record a resolution or versioned override.",
      decisionRequired: true,
      technicalDetails: rule.evidenceUrl,
    }));
}

export function gregorianEaster(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return formatDate(year, month, day);
}

function appliesTo(rule: PublicHolidayRule, jurisdiction: StateCode, year: number): boolean {
  const jurisdictions = rule.jurisdictions === "all" ? stateCodes : rule.jurisdictions;
  if (!jurisdictions.includes(jurisdiction)) {
    return false;
  }
  const date = resolveRuleDate(rule.date, year);
  return (!rule.validFrom || date >= rule.validFrom) && (!rule.validTo || date <= rule.validTo);
}

function resolveRuleDate(rule: z.infer<typeof RuleDateSchema>, year: number): string {
  if (rule.kind === "fixed") {
    return formatDate(year, rule.month, rule.day);
  }
  if (rule.kind === "easterOffset") {
    return parseDate(gregorianEaster(year)).add({ days: rule.days }).toString();
  }
  let date = formatDate(year, rule.month, rule.day);
  while (weekday(date) !== rule.weekday) {
    date = parseDate(date).subtract({ days: 1 }).toString();
  }
  return date;
}

function weekday(date: string): number {
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  const offsets = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  const adjustedYear = month < 3 ? year - 1 : year;
  const monthOffset = offsets[month - 1];
  if (monthOffset === undefined) {
    throw new Error(`Invalid month in date: ${date}`);
  }
  return (
    (adjustedYear +
      Math.floor(adjustedYear / 4) -
      Math.floor(adjustedYear / 100) +
      Math.floor(adjustedYear / 400) +
      monthOffset +
      day) %
    7
  );
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
