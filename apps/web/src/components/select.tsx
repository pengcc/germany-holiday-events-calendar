import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "../lib/cn";

export interface SelectOption {
  value: string;
  label: string;
}

interface FilterSelectProps {
  id: string;
  label: string;
  value: string;
  options: readonly SelectOption[];
  className?: string;
  onValueChange: (value: string) => void;
}

export function FilterSelect({
  id,
  label,
  value,
  options,
  className,
  onValueChange,
}: FilterSelectProps) {
  const labelId = `${id}-label`;

  return (
    <div className={cn("he-text-secondary text-sm font-medium", className)}>
      <span id={labelId} className="mb-1 block">
        {label}
      </span>
      <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
        <SelectPrimitive.Trigger
          id={id}
          aria-labelledby={labelId}
          className="he-control he-focus-ring flex min-h-11 w-full min-w-0 items-center justify-between gap-2 rounded-md border px-3 text-left"
        >
          <span className="min-w-0 flex-1 truncate">
            <SelectPrimitive.Value />
          </span>
          <SelectPrimitive.Icon asChild>
            <ChevronDown aria-hidden="true" className="size-4 shrink-0" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={4}
            collisionPadding={8}
            className="he-select-content"
          >
            <SelectPrimitive.ScrollUpButton className="he-select-scroll-button">
              <ChevronUp aria-hidden="true" className="size-4" />
            </SelectPrimitive.ScrollUpButton>
            <SelectPrimitive.Viewport className="p-1">
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value} textValue={option.label}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectPrimitive.Viewport>
            <SelectPrimitive.ScrollDownButton className="he-select-scroll-button">
              <ChevronDown aria-hidden="true" className="size-4" />
            </SelectPrimitive.ScrollDownButton>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  );
}

const SelectItem = forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ children, className, ...props }, ref) => (
  <SelectPrimitive.Item ref={ref} className={cn("he-select-item", className)} {...props}>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    <SelectPrimitive.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
      <Check aria-hidden="true" className="size-4" />
    </SelectPrimitive.ItemIndicator>
  </SelectPrimitive.Item>
));

SelectItem.displayName = "SelectItem";
