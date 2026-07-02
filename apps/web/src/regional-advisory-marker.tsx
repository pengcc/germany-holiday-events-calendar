import { Info } from "lucide-react";
import { cn } from "./lib/cn";

export function RegionalAdvisoryMarker({ className }: { className?: string }) {
  return (
    <Info
      aria-hidden="true"
      className={cn("he-advisory-marker size-3 shrink-0 stroke-[2.5]", className)}
      data-regional-advisory-marker="true"
    />
  );
}
