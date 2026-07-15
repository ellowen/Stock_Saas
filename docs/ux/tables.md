# Tables

`.table-modern` (`index.css`) es la clase base: bordes redondeados, `overflow-x-auto` (scroll horizontal en vez de romper el layout en mobile), hover de fila, soporte dark mode. `DataTable.tsx` (`components/ui/`) es el componente que la implementa con soporte de columnas configurables y orden (`useSortable`, patrón repetido en varias páginas: Customers, Suppliers, Purchases, Branches, Users).

## Patrón confirmado de vista dual mobile

Al menos Customers y Suppliers alternan tabla (desktop) por cards (mobile) en vez de depender solo de `overflow-x-auto` — es el patrón más completo, pero no confirmado como universal en todos los módulos (ver `RESPONSIVE.md`).

## Selección múltiple

Confirmado en Customers/Suppliers (borrado masivo). No confirmado como patrón reusable extraído a un componente compartido — cada página que lo implementa probablemente lo hizo ad-hoc; candidato a generalizar en `DataTable.tsx` si se repite en un tercer módulo.
