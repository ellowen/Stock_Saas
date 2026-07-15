# RESPONSIVE

No hay un sistema de breakpoints propio — se usan los defaults de Tailwind (`sm:640px`, `md:768px`, `lg:1024px`, `xl:1280px`).

## Patrón establecido (rediseño del POS, 2026-07-11)

En viewport `<640px`, la regla adoptada es **colapsar información secundaria detrás de un toggle explícito**, no simplemente re-flowear el mismo layout a una columna angosta. Ejemplo real: en el POS mobile, el detalle de línea de carrito (precio unitario, descuento aplicado) se oculta detrás de un toggle en vez de apilarse siempre visible — prioriza que la lista de ítems y el total sean lo primero que se ve.

## Estado confirmado por módulo (de esta ronda de investigación)

- **Customers/Suppliers**: tienen vista de cards para mobile además de la tabla (confirmado, commit `9a7527f "feat: vista mobile card y seleccion multiple en Clientes y Proveedores"`).
- **POS**: mobile-first explícito, es el módulo con más trabajo responsive dedicado (commit `95767e6`).
- **Resto de los módulos** (Inventory, Reports, Purchases, Documents, etc.): no se confirmó en esta ronda si tienen una vista mobile dedicada o dependen solo de `overflow-x-auto` en `.table-modern` (que permite scroll horizontal pero no es lo mismo que una vista pensada para mobile). A verificar módulo por módulo antes de asumir paridad.

## Patrón corregido: no capar el ancho de escritorio (2026-07-15)

El POS y otras 5 pantallas (Clientes, Documentos, Promociones, Compras, Proveedores) tenían su contenedor raíz con `max-w-2xl`/`max-w-5xl`/`max-w-6xl` + `mx-auto`, centrando y angostando toda la pantalla (tabla incluida) incluso en monitores anchos — dejaba espacio muerto en vez de aprovecharlo. Se corrigió en las 6: el contenedor raíz de una pantalla de lista/tabla no debería tener `max-w`, solo `space-y-6` (el padding ya lo pone `AppLayout` alrededor de `<Outlet />`) — es el patrón que Inventario/Sucursales/Usuarios ya usaban bien. Un `max-w` en un contenedor sigue siendo correcto para formularios angostos (mejor legibilidad), pero no para el contenedor que envuelve una tabla completa. Ver `ROADMAP.md`.

## Qué falta

- No hay una guía escrita de "qué colapsar primero" más allá del ejemplo del POS — cada pantalla nueva decide esto ad-hoc.
- No se confirmó testing real en dispositivos táctiles/tablets (los targets de negocio incluyen cajero con tablet/mobile en el piso de venta) — recomendable antes de dar por cerrado el soporte mobile de cualquier módulo fuera del POS.
