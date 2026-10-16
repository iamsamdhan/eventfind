import * as React from "react";
import { cn } from "@/lib/utils";
import { CalendarSearch } from "lucide-react";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-8 sm:p-12 text-center bg-slate-50/50 dark:bg-slate-900/40",
        className
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 mb-4 shadow-sm">
        {icon || <CalendarSearch className="h-7 w-7" />}
      </div>
      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
        {title}
      </h3>
      <p className="mt-1.5 max-w-sm text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
