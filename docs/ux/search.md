# Search

Patrón dominante: `SearchInput.tsx` con debounce ~300ms, búsqueda server-side (`?search=`) contra `contains` en Prisma (no full-text search confirmado). Repetido en Customers, Suppliers, Products.

## Caso especial: búsqueda del POS

Distinta del patrón genérico — acepta tanto texto libre como `Barcode+ENTER`, con match exacto de barcode priorizado sobre la búsqueda de texto, y resultados rankeados por relevancia (no alfabético/id) — ver `modules/POS.md` y `ux/barcode-scanner-ux.md`. Es el único buscador de la app con ese nivel de sofisticación; el resto de los módulos usa el patrón simple de debounce + `contains`.
