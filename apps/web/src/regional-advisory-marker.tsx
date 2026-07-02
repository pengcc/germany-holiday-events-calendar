import { MapPin } from "lucide-react";
import { cn } from "./lib/cn";

export function RegionalAdvisoryMarker({ className }: { className?: string }) {
  return (
    <MapPin
      aria-hidden="true"
      className={cn("size-3 shrink-0 fill-white stroke-sky-800 stroke-[2.5]", className)}
      data-regional-advisory-marker="true"
    />
  );
}
