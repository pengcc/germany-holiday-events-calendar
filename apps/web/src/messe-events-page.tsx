import { Link } from "@tanstack/react-router";
import { Building2, Languages } from "lucide-react";
import type { Locale } from "./i18n";
import { publicAreaCopy } from "./public-area-copy";
import { PublicAreaNavigation } from "./public-area-navigation";

export function MesseEventsPage({ locale }: { locale: Locale }) {
  const text = publicAreaCopy[locale];

  return (
    <main className="he-page min-h-screen">
      <header className="he-surface he-border-subtle border-b">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="he-button-primary flex size-9 items-center justify-center rounded-md">
              <Building2 aria-hidden="true" className="size-5" />
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
                to={`/${item}/messe-events`}
              >
                {item}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <PublicAreaNavigation activeArea="trade-fairs" locale={locale} />

      <section className="he-surface he-border-subtle border-b">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
          <p className="mb-2 text-sm font-semibold text-[var(--ui-primary)]">{text.messeEyebrow}</p>
          <h1 className="text-3xl font-bold sm:text-4xl">{text.messeTitle}</h1>
          <p className="he-text-secondary mt-3 max-w-3xl text-base leading-7">{text.messeIntro}</p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
        <div className="he-surface he-border-subtle border border-dashed p-6 text-center sm:p-10">
          <Building2 aria-hidden="true" className="mx-auto size-9 text-[var(--ui-primary)]" />
          <h2 className="mt-4 text-lg font-semibold">{text.messeStatusTitle}</h2>
          <p className="he-text-secondary mx-auto mt-2 max-w-2xl text-sm leading-6">
            {text.messeStatusBody}
          </p>
        </div>
      </section>
    </main>
  );
}
