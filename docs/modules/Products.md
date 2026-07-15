# Products — Catálogo de productos y variantes

## Propósito

Definir productos y sus variantes (con atributos configurables como talle/color), unidad real de SKU/precio/stock.

## Reglas de negocio

`Product` (`name, description?, category?, brand?`) es el agrupador; `ProductVariant` (`size?, color?, sku, barcode?, price, costPrice?`) es donde vive `sku`/`barcode` únicos por empresa. `size`/`color` son campos **legacy opcionales** — el sistema real de atributos configurables es `Attribute` + `ProductVariantAttribute` (m:n con valor). Si la empresa tiene al menos un `Attribute` configurado, el modal de UI usa exclusivamente el modo flexible (a nivel empresa, no por producto); si no tiene ninguno, usa `size`/`color`. Ambos modos ahora persisten correctamente (ver fix abajo).

## Workflow

Alta de producto con variantes (`checkProductLimit` de plan) → asignación de atributos (talle/color u otros configurables por rubro, o `size`/`color` legacy si la empresa no configuró atributos) → uso en Inventario/Ventas. Importación masiva vía CSV (busca/crea producto por nombre exacto, variante por SKU único, reemplaza atributos de la variante).

## UX / Frontend

`ProductFormModal.tsx` + `VariantManager.tsx`: si la empresa tiene atributos flexibles configurados, oculta los inputs de "Talle"/"Color" tradicionales y usa los campos dinámicos de `Attribute` en su lugar — ambos modos persisten correctamente de punta a punta (crear y editar). `CsvImportModal.tsx` también persiste atributos correctamente.

## Navegación** (dentro del módulo Inventory: tab "Productos")

No tiene ítem de sidebar propio — vive como tab dentro de `/app/inventory`.

## Permisos

`products.router.ts`: **ni `PRODUCTS_WRITE` ni `PRODUCTS_DELETE` se verifican en el backend** — solo `authMiddleware` + `checkProductLimit` en la creación. Contraste: `promotions.router.ts` sí usa `requirePermission("PRODUCTS_WRITE")` correctamente para el mismo permiso, aplicado de forma inconsistente entre ambos módulos.

## Componentes

`ProductFormModal`, `VariantManager`, `CsvImportModal`.

## Tablas / Modelo

`Product`, `ProductVariant` (`@@unique([companyId, sku])`, `@@unique([companyId, barcode])`), `Attribute` (`type: TEXT|NUMBER|SELECT`, `options` como JSON string), `ProductVariantAttribute` (`@@unique([variantId, attributeId])`).

## Mejoras futuras

Ver `ROADMAP.md`. Agregar `requirePermission` en el router (sigue pendiente).

## Problemas conocidos

1. Sin protección de permiso en el backend, inconsistente con Promotions que usa el mismo `PermissionKey` correctamente.

## Fix 2026-07-15 — `size`/`color`/atributos flexibles no se persistían

**Antes**: Zod exigía `size`/`color` como obligatorios pero `ProductService` nunca los escribía a la base (ni en creación ni en edición) — validación muerta. Además `VariantManager.tsx` reutilizaba el campo `size` como blob JSON serializado de atributos (`{attributeId: value}`), que el servicio tampoco escribía. Con atributos flexibles activados, crear/editar un producto desde el modal no persistía nada — solo la importación CSV funcionaba de punta a punta.

**Fix**: `size`/`color` pasaron a opcionales en Zod y `ProductService.createProductWithVariants`/`updateProduct` ahora los persisten realmente. `VariantManager.tsx` se reescribió para manejar `attributes` como un array real (`{attributeId, value}[]`) en vez del blob JSON, con `onUpdateAttribute` pasado desde `ProductFormModal.tsx` — que además ahora carga `AttributeDefinition[]` y decide el modo (legacy vs flexible) a nivel empresa según si hay algún `Attribute` configurado.

Se encontró un segundo bug en el camino: `updateProductController` (`products.controller.ts`) armaba el payload hacia el service mapeando campo por campo y **omitía `attributes` por completo** — el service sabía persistirlos pero nunca los recibía en edición (sí en creación, que pasa `parseResult.data` completo). Corregido agregando `attributes: v.attributes` al mapeo.

**Verificado end-to-end en el navegador + query directa a la base**, los 4 casos:
- Crear con `size`/`color` legacy (empresa sin `Attribute` configurados): `size: "XL", color: "Fucsia"` persistidos correctamente (antes se perdían).
- Crear con atributo flexible (`Attribute` "Talle" tipo SELECT): generó `ProductVariantAttribute{attributeId, value: "L"}` real (antes nunca llegaba a la base).
- Editar variante existente cambiando un atributo flexible: falló la primera vez por el bug de `updateProductController` descrito arriba (el `PATCH` devolvía `200 OK` pero no guardaba nada); tras el fix, persiste correctamente.
- Nota de UX confirmada en vivo: el modo legacy/flexible es una decisión a nivel empresa (según `attributeDefs.length > 0`), no por producto — si una empresa configura un solo `Attribute`, todos sus productos (incluidos los que ya tenían `size`/`color` cargado) pasan a mostrar los campos flexibles en el modal de edición. Los valores legacy ya guardados no se pierden en la base, pero dejan de ser editables desde la UI.
