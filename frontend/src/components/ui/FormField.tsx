import React from "react";

interface FormFieldProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
}

export function FormField({
  label,
  error,
  hint,
  required,
  children,
  htmlFor,
  className = "",
}: FormFieldProps) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
          <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>
      )}
    </div>
  );
}

// Estilos base reutilizables para inputs
export const inputClasses =
  "w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 " +
  "placeholder:text-gray-400 " +
  "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent " +
  "disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed " +
  "dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder:text-gray-500 " +
  "dark:focus:ring-primary-400 dark:disabled:bg-gray-800";

export const inputErrorClasses =
  "border-red-500 focus:ring-red-500 dark:border-red-500";
