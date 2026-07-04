import { Link } from "@tanstack/react-router";
import { ExternalLink, Landmark, Languages } from "lucide-react";
import { useEffect, useState } from "react";
import type {
  CityEventsManifest,
  PublishedCityEvent,
} from "../../../packages/data-core/src/city-events-schemas";
import { cityEventsCopy } from "./city-events-copy";
import { loadPublishedCityEvents } from "./city-events-data";
import { parseExplorerSearch } from "./explorer-search";
import type { Locale } from "./i18n";

const defaultExplorerSearch = parseExplorerSearch({});

export function CityEventsPage({ locale }: { locale: Locale }) {
  const text = cityEventsCopy[locale];
  const [records, setRecords] = useState<PublishedCityEvent[]>([]);
  const [manifest, setManifest] = useState<CityEventsManifest>();
  const [error, setError] = useState(false);

  useEffect(() => {
    loadPublishedCityEvents()
      .then((data) => {
        setRecords(data.records);
        setManifest(data.manifest);
      })
      .catch(() => setError(true));
  }, []);

  return (
    <main className="he-page min-h-screen">
      <header className="he-surface he-border-subtle border-b">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="he-button-primary flex size-9 items-center justify-center rounded-md">
              <Landmark aria-hidden="true" className="size-5" />
            </span>
            <span className="font-semibold">{text.appName}</span>
          </div>
          <nav aria-label={text.language} className="flex items-center gap-1">
            <Languages aria-hidden="true" className="he-text-muted mr-1 size-4" />
            {(["zh", "de", "en"] as const).map((item) => (
              <Link
                key={item}
                className={`he-focus-ring rounded-md px-2.5 py-1.5 text-xs font-medium uppercase ${
                  item === locale
                    ? "he-button-primary"
                    : "he-button-ghost hover:bg-[var(--ui-primary-soft)]"
                }`}
                to={`/${item}/city-events`}
              >
                {item}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <section className="he-surface he-border-subtle border-b">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
          <p className="mb-2 text-sm font-semibold text-[var(--ui-primary)]">{text.appName}</p>
          <h1 className="text-3xl font-bold sm:text-4xl">{text.title}</h1>
          <p className="he-text-secondary mt-3 max-w-3xl text-base leading-7">{text.intro}</p>
          <Link
            className="he-button-secondary he-focus-ring mt-5 inline-flex min-h-10 items-center rounded-md px-3 py-2 text-sm font-medium"
            search={defaultExplorerSearch}
            to={`/${locale}`}
          >
            {text.holidayExplorer}
          </Link>
        </div>
      </section>

      <section
        aria-labelledby="selected-events-heading"
        className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-8"
      >
        <div className="he-warning border-l-4 p-4 text-sm">
          <p className="leading-6">{text.disclaimer}</p>
        </div>

        <h2 className="mt-8 text-xl font-semibold" id="selected-events-heading">
          {text.selectedEvents}
        </h2>

        {error ? (
          <div
            className="mt-5 border-l-4 border-red-700 bg-red-50 p-4 text-sm text-red-950"
            role="alert"
          >
            <h3 className="font-semibold">{text.errorTitle}</h3>
            <p className="mt-1 leading-6">{text.errorBody}</p>
          </div>
        ) : !manifest ? (
          <p
            className="he-surface he-border-subtle he-text-secondary mt-5 border p-4 text-sm"
            role="status"
          >
            {text.loading}
          </p>
        ) : records.length === 0 ? (
          <div className="he-surface he-border-subtle mt-5 border border-dashed p-6 text-center">
            <h3 className="font-semibold">{text.emptyTitle}</h3>
            <p className="he-text-secondary mx-auto mt-2 max-w-2xl text-sm leading-6">
              {text.emptyBody}
            </p>
          </div>
        ) : (
          <ol className="mt-5 grid list-none gap-4 p-0" aria-live="polite">
            {records.map((event) => (
              <li className="he-surface he-border-subtle border p-5 sm:p-6" key={event.id}>
                <article>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="he-text-muted text-sm">
                        {formatDateRange(event.startDate, event.endDate, locale)}
                      </p>
                      <h3 className="mt-1 text-xl font-semibold">{event.title}</h3>
                    </div>
                    {event.impactLevel === "none" ? null : (
                      <span className="he-warning rounded-full border px-3 py-1 text-xs font-semibold">
                        {text.impact[event.impactLevel]}
                      </span>
                    )}
                  </div>

                  <dl className="he-text-secondary mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <dt className="font-medium text-[var(--text-primary)]">{text.date}</dt>
                      <dd className="mt-1">
                        {formatDateRange(event.startDate, event.endDate, locale)}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-[var(--text-primary)]">{text.cityLabel}</dt>
                      <dd className="mt-1">{text.city[event.city]}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-[var(--text-primary)]">
                        {text.categoryLabel}
                      </dt>
                      <dd className="mt-1">{text.category[event.category]}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-[var(--text-primary)]">{text.sourceLabel}</dt>
                      <dd className="mt-1">
                        <a
                          className="he-focus-ring inline-flex items-center gap-1 font-medium text-[var(--ui-primary)] underline-offset-4 hover:underline"
                          href={event.sourceUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {text.officialSource} · {text.source[event.source]}
                          <ExternalLink aria-hidden="true" className="size-4" />
                        </a>
                      </dd>
                    </div>
                  </dl>
                </article>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}

function formatDateRange(startDate: string, endDate: string, locale: Locale): string {
  const formatter = new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : locale, {
    dateStyle: "long",
    timeZone: "UTC",
  });
  const start = parseCalendarDate(startDate);
  if (startDate === endDate) {
    return formatter.format(start);
  }
  return `${formatter.format(start)} – ${formatter.format(parseCalendarDate(endDate))}`;
}

function parseCalendarDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
}
