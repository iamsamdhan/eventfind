import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "info" | "success" | "warning" | "error";
  title?: string;
}

export function Alert({
  className,
  variant = "info",
  title,
  children,
  ...props
}: AlertProps) {
  const icons = {
    info: <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />,
    success: <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />,
    error: <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0" />,
  };

  const variantStyles = {
    info: "border-blue-200 bg-blue-50/80 text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200",
    success: "border-emerald-200 bg-emerald-50/80 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200",
    warning: "border-amber-200 bg-amber-50/80 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200",
    error: "border-rose-200 bg-rose-50/80 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200",
  };

  return (
    <div
      role="alert"
      className={cn(
        "flex gap-3.5 rounded-2xl border p-4 text-sm leading-relaxed",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {icons[variant]}
      <div className="flex-1 space-y-1">
        {title && <h5 className="font-semibold leading-tight">{title}</h5>}
        <div className="opacity-90">{children}</div>
      </div>
    </div>
  );
}
