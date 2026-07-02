import type { ExplorerCopy } from "./i18n";
import { RegionalAdvisoryMarker } from "./regional-advisory-marker";

export function HolidayLegend({ compareMode, text }: { compareMode: boolean; text: ExplorerCopy }) {
  return (
    <fieldset className="he-text-secondary flex flex-wrap gap-x-4 gap-y-2 text-xs">
      <legend className="sr-only">{text.legend}</legend>
      <SwatchLegendItem className="he-legend-public" text={text.publicDayLegend} />
      <SwatchLegendItem className="he-legend-school" text={text.schoolDayLegend} />
      <SwatchLegendItem className="he-legend-mixed" text={text.mixedDayLegend} />
      <SwatchLegendItem className="he-legend-selected" text={text.selectedDateLegend} />
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-flex size-4 items-center justify-center" aria-hidden="true">
          <RegionalAdvisoryMarker />
        </span>
        {text.regionalAdvisoryMarkerLegend}
      </span>
      {compareMode ? <LegendItem marker="2/2" text={text.fullOverlap} /> : null}
      {compareMode ? <LegendItem marker="1/2" text={text.partialOverlap} /> : null}
    </fieldset>
  );
}

function SwatchLegendItem({ className, text }: { className: string; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`he-legend-swatch ${className}`} aria-hidden="true" />
      {text}
    </span>
  );
}

function LegendItem({ marker, text }: { marker: string; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="he-control inline-flex min-w-4 items-center justify-center rounded-sm border px-0.5 text-[9px] font-bold">
        {marker}
      </span>
      {text}
    </span>
  );
}
