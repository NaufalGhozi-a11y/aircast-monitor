import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
}

export function Button({
  className,
  variant = "secondary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded font-medium transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "px-2.5 py-1.5 text-[12px]" : "px-3.5 py-2 text-[13px]",
        variant === "primary" &&
          "bg-accent text-white hover:bg-accent-bright",
        variant === "secondary" &&
          "border border-base-600 bg-base-850 text-base-100 hover:bg-base-800",
        variant === "ghost" &&
          "text-base-300 hover:bg-base-800 hover:text-base-100",
        className
      )}
      {...props}
    />
  );
}
