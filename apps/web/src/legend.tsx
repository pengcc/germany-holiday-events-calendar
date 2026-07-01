import { HolidayMarker } from "./holiday-marker";
import type { ExplorerCopy } from "./i18n";

export function HolidayLegend({ compareMode, text }: { compareMode: boolean; text: ExplorerCopy }) {
  return (
    <fieldset className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-700">
      <legend className="sr-only">{text.legend}</legend>
      <CategoryLegendItem category="public" text={text.publicMarkerLegend} />
      <CategoryLegendItem category="school" text={text.schoolMarkerLegend} />
      <BackgroundLegendItem className="border-amber-500 bg-amber-200" text={text.publicDayLegend} />
      <BackgroundLegendItem
        className="border-emerald-600 bg-emerald-100"
        text={text.schoolDayLegend}
      />
      {compareMode ? <LegendItem marker="2/2" text={text.fullOverlap} /> : null}
      {compareMode ? <LegendItem marker="1/2" text={text.partialOverlap} /> : null}
    </fieldset>
  );
}

function BackgroundLegendItem({ className, text }: { className: string; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`size-4 rounded-sm border ${className}`} aria-hidden="true" />
      {text}
    </span>
  );
}

function CategoryLegendItem({ category, text }: { category: "public" | "school"; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex size-4 items-center justify-center" aria-hidden="true">
        <HolidayMarker category={category} />
      </span>
      {text}
    </span>
  );
}

function LegendItem({ marker, text }: { marker: string; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex min-w-4 items-center justify-center rounded-sm border border-slate-300 bg-white px-0.5 text-[9px] font-bold text-slate-800">
        {marker}
      </span>
      {text}
    </span>
  );
}
