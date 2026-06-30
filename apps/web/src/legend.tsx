import type { ExplorerCopy } from "./i18n";

export function HolidayLegend({ text }: { text: ExplorerCopy }) {
  return (
    <fieldset className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-700">
      <legend className="sr-only">{text.legend}</legend>
      <LegendItem marker={text.publicMarker} text={text.public} />
      <LegendItem marker={text.schoolMarker} text={text.school} />
      <LegendItem marker="2/2" text={text.fullOverlap} />
      <LegendItem marker="1/2" text={text.partialOverlap} />
      <LegendItem marker="1" text={text.singleStateActivity} />
    </fieldset>
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
