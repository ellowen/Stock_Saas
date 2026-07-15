# DESIGN_SYSTEM — Sistema de diseño real (no Material UI)

**Corrección de expectativa**: el frontend no usa Material UI, Ant Design, Chakra ni ninguna librería de componentes. Es Tailwind CSS 3 puro con un puñado de clases utilitarias propias definidas en `frontend/src/index.css` (`@layer components`) y un set pequeño de componentes React reusables en `frontend/src/components/ui/`. Si el objetivo del equipo es migrar a MUI en algún momento, es una decisión de arquitectura grande que hay que tomar explícitamente — no es un cambio incremental, tocaría cada pantalla.

## Paleta

`frontend/tailwind.config.cjs` sí extiende el theme — define un token `primary` (escala azul, `primary-600` = `#2563eb`) más `borderRadius.card/modal`, `boxShadow.card/modal` y animaciones `fade-in`/`slide-up`. **Pero la mayoría de las pantallas no lo usan**: usan `indigo-*` hardcodeado directamente (ver "Problema real" abajo).

| Rol | Clase Tailwind realmente usada | Uso |
|---|---|---|
| Acento / marca (mayoría de pantallas) | `indigo-600` (hover `indigo-500`) | Botón primario, links activos, foco de inputs — `.btn-primary` en `index.css` usa `indigo-*` |
| Acento / marca (algunas pantallas) | `primary-600` (token del config, azul `#2563eb`) | Botón "Nuevo" en `SuppliersPage`, `PromotionsPage` y otras páginas armadas con ese patrón |
| Neutro de fondo | `slate-50` (claro) / `slate-900` (oscuro, body) | Fondo de página |
| Neutro de superficie | `white` / `slate-800` | Cards, tablas, modales |
| Neutro de borde | `slate-200`/`slate-300` (claro) / `slate-600` (oscuro) | Bordes de inputs, cards, tablas |
| Neutro de texto secundario | `slate-500`/`slate-400` | Labels, texto muted |
| Éxito | `emerald-*` | Confirmaciones, recibo, badges "Activo" |
| Alerta / advertencia | `amber-*` | Vuelto insuficiente, promo aplicada, stock bajo |
| Error / peligro | `red-*` | Validaciones, botón eliminar, badges "Anulada" |

### Problema real: dos sistemas de acento en paralelo

`indigo-600` (usado directamente, sin pasar por el theme) y `primary-600` (token del config, que resuelve a un azul ligeramente distinto) conviven en la misma app. Un usuario atento notaría que el botón "Nueva promoción" es de un azul distinto al botón "Cobrar" del POS. No es intencional — es el resultado de páginas escritas en momentos distintos sin un lint/regla que fuerce usar el token. Antes de agregar una pantalla nueva, **conviene decidir uno de los dos y migrar el otro**, no sumar una tercera variante.

Modo oscuro: clase `.dark` en el `<html>` (ver `ThemeContext`), cada componente define su variante con el prefijo `dark:` de Tailwind — no hay un segundo set de tokens, es literalmente el mismo componente con clases condicionales.

## Clases utilitarias compartidas (`index.css`)

| Clase | Para qué |
|---|---|
| `.input-minimal` | Todo `<input>`/`<select>`/`<textarea>` de la app |
| `.btn-primary` | Acción principal (indigo, texto blanco) |
| `.btn-secondary` | Acción secundaria (borde, fondo blanco) |
| `.card-minimal` | Contenedor tipo card |
| `.table-modern` | Wrapper de tabla (bordes redondeados, `overflow-x-auto`, hover de fila, dark mode) |

Cualquier pantalla nueva debería reusar estas clases en vez de escribir estilos de input/botón/tabla desde cero — es lo que da consistencia visual sin un component library formal.

## Componentes compartidos (`components/ui/`)

| Componente | Qué es |
|---|---|
| `Button.tsx` | Wrapper tipado sobre `.btn-primary`/`.btn-secondary` con variantes |
| `Badge.tsx` | Pill de estado (`success`/`danger`/`warning`/`neutral`) — usado para estados de venta, promoción activa/inactiva, etc. |
| `ConfirmModal.tsx` | Diálogo de confirmación genérico (título, mensaje, variante `danger`/`warning`/`default`) — el único patrón de "modal de confirmación" en toda la app, se reusa en todos los módulos con delete |
| `Modal.tsx` | Modal base (usado por `ConfirmModal` y otros) |
| `DataTable.tsx` | Tabla con soporte de columnas/orden |
| `EmptyState.tsx` | Estado vacío reusable (ver `ux/empty-states.md`) |
| `FormField.tsx` | Wrapper de label + input + error |
| `PageHeader.tsx` | Título + subtítulo + acciones de una página (`title`, `subtitle`, `actions`, `breadcrumb`) |
| `SearchInput.tsx` | Input de búsqueda con debounce |
| `Select.tsx` | Select estilizado |
| `StatCard.tsx` | Card de métrica (dashboard/reportes) |

Componentes fuera de `ui/` pero igualmente compartidos: `Tooltip.tsx`, `Pagination.tsx`, `Skeleton.tsx`, `TableSortHeader.tsx`, `Barcode.tsx` (renderiza CODE128 con jsbarcode), `GiroLogo.tsx`, `Icons.tsx` (todos los íconos SVG inline de la app, sin librería de íconos externa).

## Iconografía

`components/Icons.tsx` — cada ícono es un componente función que devuelve un `<svg>` con `stroke="currentColor"`, sin depender de una librería (no Heroicons, no Lucide como paquete — los SVGs están vendorizados/escritos a mano). Agregar un ícono nuevo significa agregar una función más ahí, siguiendo el mismo patrón (`viewBox="0 0 24 24"`, `strokeWidth={2}`, `className = iconClass` por default).

## Patrón de modal vs. inline (regla real, no aspiracional)

El rediseño del POS (2026-07-11) estableció explícitamente esta jerarquía y ya está aplicada:
1. **Preferir inline** sobre modal siempre que la acción no interrumpa el flujo principal (editar cantidad, aplicar descuento, cambiar precio — todo inline en `CartItem`).
2. **Panel in-place** en vez de modal cuando la acción reemplaza temporalmente el contenido principal de la pantalla sin perder contexto (pago en el POS: `PaymentPanel` reemplaza el área del carrito, no la tapa con un overlay).
3. **Modal reservado** para confirmaciones destructivas (`ConfirmModal`) y formularios de alta/edición de entidades secundarias (crear proveedor, crear promoción) donde interrumpir sí es aceptable porque no es un flujo de alta frecuencia.

Ver `ux/dialogs-modals.md` para el detalle y `modules/POS.md` para el caso de estudio completo (por qué se migró de `PaymentModal` a `PaymentPanel`).

## Responsive

No hay un breakpoint system documentado más allá de los defaults de Tailwind (`sm:640px`, `md:768px`, `lg:1024px`). El patrón establecido en el rediseño del POS: en `<640px` colapsar información secundaria detrás de un toggle explícito en vez de simplemente re-flowear el mismo layout a una columna más angosta. Ver `ux/responsive-rules.md` y `RESPONSIVE.md`.

## Deuda de diseño conocida

- No existe un archivo de tokens central (`tailwind.config.js` con theme extendido) — los colores están hardcodeados como clases de Tailwind directamente en cada componente. Cambiar el color de marca hoy requeriría un find-and-replace, no editar un token.
- No hay Storybook ni catálogo visual de componentes — `components/ui/` se descubre leyendo código, no hay documentación visual navegable.
- Iconografía vendorizada a mano: agregar íconos es más trabajo que instalar un paquete, pero da control total y cero dependencia externa.
