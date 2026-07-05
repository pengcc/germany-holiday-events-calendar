import { Link } from "@tanstack/react-router";
import { ChevronDown, ExternalLink, Info, Landmark, Languages } from "lucide-react";
import { useEffect, useState } from "react";
import type {
  CityEventsManifest,
  PublishedCityEvent,
} from "../../../packages/data-core/src/city-events-schemas";
import { cityEventsCopy } from "./city-events-copy";
import { loadPublishedCityEvents } from "./city-events-data";
import type { Locale } from "./i18n";
import { PublicAreaNavigation } from "./public-area-navigation";

export function CityEventsPage({ locale }: { locale: Locale }) {
  const text = cityEventsCopy[locale];
  const [records, setRecords] = useState<PublishedCityEvent[]>([]);
  const [manifest, setManifest] = useState<CityEventsManifest>();
  const [error, setError] = useState(false);
  const [showPastEvents, setShowPastEvents] = useState(false);

  useEffect(() => {
    loadPublishedCityEvents()
      .then((data) => {
        setRecords(data.records);
        setManifest(data.manifest);
      })
      .catch(() => setError(true));
  }, []);

  const todayGermanyDate = getTodayGermanyDate();
  const upcomingEvents = records
    .filter((event) => event.endDate >= todayGermanyDate)
    .sort(
      (left, right) =>
        left.startDate.localeCompare(right.startDate) || left.id.localeCompare(right.id),
    );
  const pastEvents = records
    .filter((event) => event.endDate < todayGermanyDate)
    .sort(
      (left, right) => right.endDate.localeCompare(left.endDate) || right.id.localeCompare(left.id),
    );

  return (
    <main className="city-events-theme min-h-screen">
      <header className="city-events-surface city-events-border-subtle border-b">
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

      <PublicAreaNavigation activeArea="culture-events" locale={locale} />

      <section className="city-events-surface city-events-border-subtle border-b">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
          <p className="mb-2 text-sm font-semibold text-[var(--ui-primary)]">{text.appName}</p>
          <h1 className="text-3xl font-bold sm:text-4xl">{text.title}</h1>
          <p className="city-events-text-secondary mt-3 max-w-3xl text-base leading-7">
            {text.intro}
          </p>
        </div>
      </section>

      <section
        aria-labelledby="upcoming-events-heading"
        className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-8"
      >
        <section
          aria-label={text.sourceNotice}
          className="city-events-notice flex gap-3 border-l-4 p-4 text-sm"
        >
          <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <p className="leading-6">{text.disclaimer}</p>
        </section>

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
          <div aria-live="polite">
            <h2 className="mt-8 text-xl font-semibold" id="upcoming-events-heading">
              {text.upcomingEvents}
            </h2>

            {upcomingEvents.length === 0 ? (
              <div className="city-events-card mt-5 border border-dashed p-6 text-center">
                <h3 className="font-semibold">{text.noUpcomingTitle}</h3>
                <p className="city-events-text-secondary mx-auto mt-2 max-w-2xl text-sm leading-6">
                  {text.noUpcomingBody}
                </p>
              </div>
            ) : (
              <EventList events={upcomingEvents} locale={locale} text={text} />
            )}

            {pastEvents.length === 0 ? null : (
              <section aria-labelledby="past-events-heading" className="mt-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold" id="past-events-heading">
                    {text.pastEvents}
                  </h2>
                  <button
                    aria-controls="past-events-list"
                    aria-expanded={showPastEvents}
                    className="he-button-secondary he-focus-ring inline-flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium"
                    onClick={() => setShowPastEvents((current) => !current)}
                    type="button"
                  >
                    {showPastEvents ? text.hidePastEvents : text.showPastEvents}
                    <ChevronDown
                      aria-hidden="true"
                      className={`size-4 transition-transform ${showPastEvents ? "rotate-180" : ""}`}
                    />
                  </button>
                </div>
                <EventList
                  events={pastEvents}
                  hidden={!showPastEvents}
                  id="past-events-list"
                  locale={locale}
                  text={text}
                />
              </section>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

type CityEventsText = (typeof cityEventsCopy)[Locale];

function EventList({
  events,
  hidden,
  id,
  locale,
  text,
}: {
  events: PublishedCityEvent[];
  hidden?: boolean;
  id?: string;
  locale: Locale;
  text: CityEventsText;
}) {
  return (
    <ul className="mt-5 grid list-none gap-4 p-0" hidden={hidden} id={id}>
      {events.map((event) => (
        <li className="city-events-card rounded-lg border" key={event.id}>
          <article className="flex h-full flex-col">
            <header className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
              <div className="min-w-0">
                <p className="city-events-text-secondary text-base font-semibold">
                  {formatDateRange(event.startDate, event.endDate, locale)}
                </p>
                <h3 className="mt-1 text-xl font-semibold leading-snug">{event.title}</h3>
              </div>
              {event.impactLevel === "none" ? null : (
                <span
                  className={`city-events-impact-badge city-events-impact-${event.impactLevel} rounded-full border px-3 py-1 text-xs font-semibold`}
                >
                  {text.impact[event.impactLevel]}
                </span>
              )}
            </header>

            <div className="city-events-card-divider border-t px-5 py-4 sm:px-6">
              <dl className="city-events-text-secondary grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-medium text-[var(--city-events-text-primary)]">
                    {text.cityLabel}
                  </dt>
                  <dd className="mt-1">{text.city[event.city]}</dd>
                </div>
                <div>
                  <dt className="font-medium text-[var(--city-events-text-primary)]">
                    {text.categoryLabel}
                  </dt>
                  <dd className="mt-1">{text.category[event.category]}</dd>
                </div>
              </dl>
            </div>

            <footer className="city-events-card-divider mt-auto border-t px-5 py-4 sm:px-6">
              <a
                className="city-events-source-link he-focus-ring inline-flex items-center gap-1.5 font-medium underline-offset-4 hover:underline"
                href={event.sourceUrl}
                rel="noreferrer"
                target="_blank"
              >
                {text.officialSource} · {text.source[event.source]}
                <ExternalLink aria-hidden="true" className="size-4" />
              </a>
            </footer>
          </article>
        </li>
      ))}
    </ul>
  );
}

function getTodayGermanyDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Berlin",
    year: "numeric",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
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
