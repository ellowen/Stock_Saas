import React from "react";

type Variant = "success" | "warning" | "danger" | "info" | "neutral" | "primary";
type Size = "sm" | "md";

interface BadgeProps {
  variant?: Variant;
  size?: Size;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

const variantClasses: Record<Variant, string> = {
  success: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  danger:  "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  info:    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  neutral: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  primary: "bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-400",
};

const dotClasses: Record<Variant, string> = {
  success: "bg-green-500",
  warning: "bg-yellow-500",
  danger:  "bg-red-500",
  info:    "bg-blue-500",
  neutral: "bg-gray-400",
  primary: "bg-primary-500",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-xs",
};

export function Badge({ variant = "neutral", size = "md", dot, children, className = "" }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 font-medium rounded-full",
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(" ")}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClasses[variant]}`} />
      )}
      {children}
    </span>
  );
}
