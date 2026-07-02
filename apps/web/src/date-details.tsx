import type { HolidayRecord } from "@hsg/data-core/schemas";
import type { CalendarDay } from "./calendar";
import type { ExplorerCopy, Locale } from "./i18n";
import { stateNames } from "./i18n";
import { RegionalAdvisoryMarker } from "./regional-advisory-marker";

interface DateDetailsProps {
  selectedDate?: string;
  day?: CalendarDay;
  locale: Locale;
  text: ExplorerCopy;
}

export function DateDetails({ selectedDate, day, locale, text }: DateDetailsProps) {
  return (
    <section
      aria-labelledby="date-details-heading"
      aria-live="polite"
      className="border border-slate-200 bg-white p-4 xl:sticky xl:top-4"
    >
      <h2 id="date-details-heading" className="text-base font-semibold">
        {text.dateDetails}
      </h2>
      {!selectedDate ? (
        <p className="mt-3 text-sm leading-6 text-slate-600">{text.selectDatePrompt}</p>
      ) : (
        <>
          <h3 className="mt-3 text-lg font-semibold">
            <time dateTime={selectedDate}>{formatDate(selectedDate, locale)}</time>
          </h3>
          {day && day.records.length > 0 ? (
            <>
              {day.activityRecords.length > 0 ? (
                <ul className="mt-4 grid gap-3">
                  {day.activityRecords.map((record) => (
                    <li key={record.id}>
                      <HolidayRecordDetails locale={locale} record={record} text={text} />
                    </li>
                  ))}
                </ul>
              ) : null}
              {day.advisoryRecords.length > 0 ? (
                <section
                  aria-label={text.regionalAdvisoryTitle}
                  className="mt-4 border border-sky-200 bg-sky-50 p-3"
                >
                  <div className="flex items-center gap-2 text-sky-950">
                    <RegionalAdvisoryMarker className="size-4" />
                    <h4 className="font-semibold">{text.regionalAdvisoryTitle}</h4>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {text.regionalAdvisoryBody}
                  </p>
                  <ul className="mt-3 grid gap-3">
                    {day.advisoryRecords.map((record) => (
                      <li key={record.id}>
                        <RegionalAdvisoryDetails locale={locale} record={record} text={text} />
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </>
          ) : (
            <p className="mt-3 border-l-4 border-slate-300 bg-slate-50 p-3 text-sm text-slate-700">
              {text.emptyDateDetails}
            </p>
          )}
        </>
      )}
    </section>
  );
}

function RegionalAdvisoryDetails({
  record,
  locale,
  text,
}: {
  record: HolidayRecord;
  locale: Locale;
  text: ExplorerCopy;
}) {
  return (
    <article className="border-l-2 border-sky-700 pl-3">
      <h5 className="font-semibold text-slate-900">{record.names[locale]}</h5>
      <dl className="mt-2 grid gap-2 text-sm">
        <DetailRow
          label={text.state}
          value={`${stateNames[record.jurisdiction]?.[locale] ?? record.jurisdiction} (${record.jurisdiction})`}
        />
        <DetailRow label={text.inclusiveDates} value={formatRange(record, locale)} />
        <DetailRow label={text.applicability} value={text.regionalLimitedApplicability} />
        <DetailRow
          label={text.sourceReference}
          value={
            record.source.sourceEventId
              ? `${record.source.sourceId} · ${record.source.sourceEventId}`
              : record.source.sourceId
          }
        />
      </dl>
    </article>
  );
}

function HolidayRecordDetails({
  record,
  locale,
  text,
}: {
  record: HolidayRecord;
  locale: Locale;
  text: ExplorerCopy;
}) {
  return (
    <article className="border border-slate-200 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h4 className="font-semibold">{record.names[locale]}</h4>
        <span className="rounded-sm bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
          {record.category === "public" ? text.public : text.school}
        </span>
      </div>
      <dl className="mt-3 grid gap-2 text-sm">
        <DetailRow
          label={text.state}
          value={`${stateNames[record.jurisdiction]?.[locale] ?? record.jurisdiction} (${record.jurisdiction})`}
        />
        <DetailRow label={text.inclusiveDates} value={formatRange(record, locale)} />
        <DetailRow label={text.applicability} value={formatApplicability(record, text)} />
        <DetailRow
          label={text.sourceReference}
          value={
            record.source.sourceEventId
              ? `${record.source.sourceId} · ${record.source.sourceEventId}`
              : record.source.sourceId
          }
        />
      </dl>
    </article>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 break-words text-slate-800">{value}</dd>
    </div>
  );
}

function formatRange(record: HolidayRecord, locale: Locale): string {
  const start = formatDate(record.startDate, locale);
  return record.startDate === record.endDate
    ? start
    : `${start} – ${formatDate(record.endDate, locale)}`;
}

function formatApplicability(record: HolidayRecord, text: ExplorerCopy): string {
  const scope =
    record.scope === "statewide"
      ? text.statewide
      : record.scope === "regional"
        ? text.regional
        : text.schoolSpecific;
  return record.regions.length > 0 ? `${scope}: ${record.regions.join(", ")}` : scope;
}

function formatDate(date: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}
