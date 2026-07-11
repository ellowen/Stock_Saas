/**
 * Shared formatting utilities. Always use these — never inline toLocaleString/toFixed.
 */

const AR_CURRENCY: Intl.NumberFormatOptions = {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};

const AR_CURRENCY_COMPACT: Intl.NumberFormatOptions = {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
};

/** Full currency with 2 decimals: $ 1.234,56 */
export function formatCurrency(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return isNaN(n) ? "$ 0,00" : n.toLocaleString("es-AR", AR_CURRENCY);
}

/** Compact currency for KPIs (no decimals): $ 1.234 */
export function formatCurrencyCompact(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return isNaN(n) ? "$ 0" : n.toLocaleString("es-AR", AR_CURRENCY_COMPACT);
}

/**
 * Fechas guardadas sin hora (hireDate, journal date, etc.) llegan del backend
 * como ISO en UTC medianoche ("2026-07-11T00:00:00.000Z"). Formatearlas con
 * la zona local del navegador les resta un dia en cualquier huso negativo
 * (Argentina = UTC-3). Por eso estas funciones fuerzan timeZone: "UTC".
 */

/** Short date: 12/04/2026 */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
}

/** Medium date: 12 abr 2026 */
export function formatDateMedium(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** Month+year: abr 2026 */
export function formatMonth(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("es-AR", { month: "short", year: "numeric", timeZone: "UTC" });
}
