# COMPONENT_LIBRARY

Ver primero `DESIGN_SYSTEM.md` — este documento no lo duplica, agrega el detalle de uso de cada componente compartido.

## `components/ui/`

| Componente | Props clave (uso observado) | Notas |
|---|---|---|
| `Button.tsx` | variante (`primary`/`secondary`), `disabled`, `loading` | Wrapper sobre `.btn-primary`/`.btn-secondary` de `index.css` |
| `Badge.tsx` | `variant`: `success`/`danger`/`warning`/`neutral` | Usado para estado de venta, activo/inactivo, etc. |
| `Modal.tsx` | `isOpen`, `onClose`, `title`, children | Base de todos los modales de la app |
| `ConfirmModal.tsx` | `variant`: `danger`/`warning`/`default`, `onConfirm` | Único patrón de confirmación destructiva en toda la app — reusar siempre en vez de un `window.confirm()` o un modal ad-hoc |
| `DataTable.tsx` | columnas configurables, soporte de orden | No confirmado en esta ronda si soporta paginación integrada o si cada página pagina por su cuenta — verificar antes de asumir en un módulo nuevo |
| `EmptyState.tsx` | `title`, `description`, `action?` | Reusar en vez de un `<p>` suelto cuando una lista está vacía |
| `FormField.tsx` | label + input + error | Wrapper estándar para inputs de formulario |
| `PageHeader.tsx` | `title`, `subtitle`, `actions`, `breadcrumb?` | Encabezado estándar de cada página de módulo |
| `SearchInput.tsx` | debounce interno | Usado en Customers, Suppliers, Products — patrón de búsqueda estándar (~300ms de debounce confirmado en varios módulos) |
| `Select.tsx` | — | Select estilizado, reemplaza el `<select>` nativo sin estilar |
| `StatCard.tsx` | `label`, `value`, `trend?` | Usado en Dashboard y Reports para KPIs |

## Fuera de `ui/` pero compartidos entre módulos

`Tooltip.tsx`, `Pagination.tsx`, `Skeleton.tsx` (loading state), `TableSortHeader.tsx`, `Barcode.tsx` (CODE128 vía `jsbarcode`), `GiroLogo.tsx`, `Icons.tsx` (todos los SVG inline).

También compartido pero específico de un dominio, no genérico: `components/documents/DocumentTemplate.tsx` + `usePrintDocument.ts` (plantilla de impresión A4 + hook de exportación a PDF/print, usado por Documents — notar que `PurchaseOrdersPage.tsx` **no** reusa esto, tiene su propio modal de impresión ad-hoc con `window.print()`, una inconsistencia a resolver si se unifica impresión en el futuro).

## Qué falta

No hay Storybook ni catálogo visual navegable — la única forma de conocer un componente es leer su código o su uso real en una página. Si el catálogo de componentes crece, vale la pena evaluar Storybook u otra herramienta liviana equivalente.
