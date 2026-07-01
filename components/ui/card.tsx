import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border-2 border-border bg-surface p-4 shadow-[0_4px_0_0_var(--color-border)]",
        className,
      )}
      {...props}
    />
  );
}
