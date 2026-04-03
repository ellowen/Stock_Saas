import React from "react";

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumb?: BreadcrumbItem[];
}

export function PageHeader({ title, subtitle, actions, breadcrumb }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-1 mb-6">
      {breadcrumb && breadcrumb.length > 0 && (
        <nav className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
          {breadcrumb.map((item, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span>/</span>}
              {item.onClick ? (
                <button
                  onClick={item.onClick}
                  className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  {item.label}
                </button>
              ) : (
                <span className="text-gray-700 dark:text-gray-200 font-medium">{item.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>
    </div>
  );
}
