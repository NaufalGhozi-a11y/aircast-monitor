import { cn } from "@/lib/utils";
import type { TextareaHTMLAttributes } from "react";

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded border border-base-600 bg-base-850 px-3 py-2 text-[13px] text-base-100 placeholder:text-base-400 focus:border-accent focus:outline-none",
        className
      )}
      {...props}
    />
  );
}
