# Products — Catálogo de productos y variantes

## Propósito

Definir productos y sus variantes (con atributos configurables como talle/color), unidad real de SKU/precio/stock.

## Reglas de negocio

`Product` (`name, description?, category?, brand?`) es el agrupador; `ProductVariant` (`size?, color?, sku, barcode?, price, costPrice?`) es donde vive `sku`/`barcode` únicos por empresa. `size`/`color` son campos **legacy opcionales** — el sistema real de atributos configurables es `Attribute` + `ProductVariantAttribute` (m:n con valor), pensado para reemplazarlos.

## Workflow

Alta de producto con variantes (`checkProductLimit` de plan) → asignación de atributos (talle/color u otros configurables por rubro) → uso en Inventario/Ventas. Importación masiva vía CSV (busca/crea producto por nombre exacto, variante por SKU único, reemplaza atributos de la variante).

## UX / Frontend

`ProductFormModal.tsx` + `VariantManager.tsx`: si la empresa tiene atributos flexibles configurados, oculta los inputs de "Talle"/"Color" tradicionales — pero (ver bug abajo) el mecanismo de reemplazo está roto. `CsvImportModal.tsx` es la única vía que persiste atributos correctamente de punta a punta.

## Navegación** (dentro del módulo Inventory: tab "Productos")

No tiene ítem de sidebar propio — vive como tab dentro de `/app/inventory`.

## Permisos

`products.router.ts`: **ni `PRODUCTS_WRITE` ni `PRODUCTS_DELETE` se verifican en el backend** — solo `authMiddleware` + `checkProductLimit` en la creación. Contraste: `promotions.router.ts` sí usa `requirePermission("PRODUCTS_WRITE")` correctamente para el mismo permiso, aplicado de forma inconsistente entre ambos módulos.

## Componentes

`ProductFormModal`, `VariantManager`, `CsvImportModal`.

## Tablas / Modelo

`Product`, `ProductVariant` (`@@unique([companyId, sku])`, `@@unique([companyId, barcode])`), `Attribute` (`type: TEXT|NUMBER|SELECT`, `options` como JSON string), `ProductVariantAttribute` (`@@unique([variantId, attributeId])`).

## Mejoras futuras

Ver `ROADMAP.md` P2. Agregar `requirePermission` en el router. Arreglar el flujo de atributos flexibles en el modal de UI (hoy solo el CSV funciona bien de punta a punta) o directamente eliminar `size`/`color` del schema/validación si el reemplazo por `Attribute` ya es la dirección definitiva.

## Problemas conocidos

1. **Validación Zod exige `size`/`color` como obligatorios, pero `ProductService` nunca los persiste** (ni en creación ni en edición) — validación muerta que además rompe el flujo de atributos flexibles: `VariantManager.tsx` reutiliza el campo `size` como blob JSON serializado de atributos (`{attributeId: value}`), que el servicio ni siquiera escribe a la base de datos. Con atributos flexibles activados, crear/editar un producto desde el modal **no persiste los valores de atributo**, y puede fallar la validación porque `color` queda vacío. Solo la importación CSV persiste `ProductVariantAttribute` correctamente.
2. Sin protección de permiso en el backend, inconsistente con Promotions que usa el mismo `PermissionKey` correctamente.

## Preguntas abiertas

¿`size`/`color` deberían eliminarse del todo (ya que `Attribute` los reemplaza conceptualmente) o mantenerse como un caso simple para empresas que no configuran atributos custom? Si se mantienen, el modal de UI necesita manejar ambos modos sin el hack actual de blob JSON en un campo que no se guarda.
