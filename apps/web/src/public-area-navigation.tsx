import { Link } from "@tanstack/react-router";
import type { Locale } from "./i18n";
import { type PublicArea, publicAreaCopy } from "./public-area-copy";

export function PublicAreaNavigation({
  activeArea,
  locale,
}: {
  activeArea: PublicArea;
  locale: Locale;
}) {
  const text = publicAreaCopy[locale];
  const baseClassName =
    "he-focus-ring inline-flex min-h-10 items-center rounded-md border px-3 py-2 text-sm font-medium";
  const inactiveClassName =
    "he-border-subtle he-surface he-text-secondary hover:bg-[var(--ui-primary-soft)]";
  const activeClassName =
    "border-[var(--ui-primary-border)] bg-[var(--ui-primary-soft)] text-[var(--ui-primary)]";

  return (
    <nav aria-label={text.navigationLabel} className="he-surface he-border-subtle border-b">
      <div className="mx-auto flex max-w-[1480px] flex-wrap gap-2 px-4 py-3 sm:px-6">
        <a
          aria-current={activeArea === "holidays" ? "page" : undefined}
          className={`${baseClassName} ${activeArea === "holidays" ? activeClassName : inactiveClassName}`}
          href={`/${locale}`}
        >
          {text.holidays}
        </a>
        <Link
          aria-current={activeArea === "trade-fairs" ? "page" : undefined}
          className={`${baseClassName} ${activeArea === "trade-fairs" ? activeClassName : inactiveClassName}`}
          to={`/${locale}/messe-events`}
        >
          {text.tradeFairs}
        </Link>
        <Link
          aria-current={activeArea === "culture-events" ? "page" : undefined}
          className={`${baseClassName} ${activeArea === "culture-events" ? activeClassName : inactiveClassName}`}
          to={`/${locale}/city-events`}
        >
          {text.cultureEvents}
        </Link>
      </div>
    </nav>
  );
}
