import React from "react";
import { inputClasses } from "./FormField";

interface Option {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: Option[];
  placeholder?: string;
  loading?: boolean;
}

export function Select({
  options,
  placeholder,
  loading,
  className = "",
  ...props
}: SelectProps) {
  return (
    <div className="relative">
      <select
        className={`${inputClasses} appearance-none pr-8 ${className}`}
        disabled={loading || props.disabled}
        {...props}
      >
        {placeholder && (
          <option value="">{loading ? "Cargando..." : placeholder}</option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <svg
        className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}
