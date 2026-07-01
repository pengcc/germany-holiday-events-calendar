import type { HolidayRecord } from "@hsg/data-core/schemas";
import { cn } from "./lib/cn";

interface HolidayMarkerProps {
  category: HolidayRecord["category"];
  className?: string;
}

export function HolidayMarker({ category, className }: HolidayMarkerProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "block size-2 shrink-0 border",
        category === "public"
          ? "rounded-full border-violet-950/20 bg-violet-800"
          : "rotate-45 rounded-[1px] border-cyan-950/20 bg-cyan-700",
        className,
      )}
      data-holiday-marker={category}
    />
  );
}
