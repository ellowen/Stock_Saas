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

`products.router.ts`: `POST /`, `PATCH /:id`, `DELETE /:id` y `POST /import-csv` usan `requirePermission("PRODUCTS_WRITE"/"PRODUCTS_DELETE")` (agregado en el batch P0 de seguridad, commit `e0c8711`). `GET` (listar/categorías/marcas) solo exige `authMiddleware`, sin permiso dedicado — igual que el resto de los módulos de solo lectura.

## Componentes

`ProductFormModal`, `VariantManager`, `CsvImportModal`.

## Tablas / Modelo

`Product`, `ProductVariant` (`@@unique([companyId, sku])`, `@@unique([companyId, barcode])`), `Attribute` (`type: TEXT|NUMBER|SELECT`, `options` como JSON string), `ProductVariantAttribute` (`@@unique([variantId, attributeId])`).

## Mejoras futuras

Ver `ROADMAP.md`.

## Problemas conocidos

Ninguno abierto por el momento (ver histórico de fixes abajo).

## Fix 2026-07-15 — `size`/`color`/atributos flexibles no se persistían

**Antes**: Zod exigía `size`/`color` como obligatorios pero `ProductService` nunca los escribía a la base (ni en creación ni en edición) — validación muerta. Además `VariantManager.tsx` reutilizaba el campo `size` como blob JSON serializado de atributos (`{attributeId: value}`), que el servicio tampoco escribía. Con atributos flexibles activados, crear/editar un producto desde el modal no persistía nada — solo la importación CSV funcionaba de punta a punta.

**Fix**: `size`/`color` pasaron a opcionales en Zod y `ProductService.createProductWithVariants`/`updateProduct` ahora los persisten realmente. `VariantManager.tsx` se reescribió para manejar `attributes` como un array real (`{attributeId, value}[]`) en vez del blob JSON, con `onUpdateAttribute` pasado desde `ProductFormModal.tsx` — que además ahora carga `AttributeDefinition[]` y decide el modo (legacy vs flexible) a nivel empresa según si hay algún `Attribute` configurado.

Se encontró un segundo bug en el camino: `updateProductController` (`products.controller.ts`) armaba el payload hacia el service mapeando campo por campo y **omitía `attributes` por completo** — el service sabía persistirlos pero nunca los recibía en edición (sí en creación, que pasa `parseResult.data` completo). Corregido agregando `attributes: v.attributes` al mapeo.

**Verificado end-to-end en el navegador + query directa a la base**, los 4 casos:
- Crear con `size`/`color` legacy (empresa sin `Attribute` configurados): `size: "XL", color: "Fucsia"` persistidos correctamente (antes se perdían).
- Crear con atributo flexible (`Attribute` "Talle" tipo SELECT): generó `ProductVariantAttribute{attributeId, value: "L"}` real (antes nunca llegaba a la base).
- Editar variante existente cambiando un atributo flexible: falló la primera vez por el bug de `updateProductController` descrito arriba (el `PATCH` devolvía `200 OK` pero no guardaba nada); tras el fix, persiste correctamente.
- Nota de UX confirmada en vivo: el modo legacy/flexible es una decisión a nivel empresa (según `attributeDefs.length > 0`), no por producto — si una empresa configura un solo `Attribute`, todos sus productos (incluidos los que ya tenían `size`/`color` cargado) pasan a mostrar los campos flexibles en el modal de edición. Los valores legacy ya guardados no se pierden en la base, pero dejan de ser editables desde la UI.

## Fix 2026-07-16 — casos borde de atributos + tests automatizados

Tras el fix del día anterior, se probaron explícitamente los casos borde que habían quedado sin cubrir:

- **Múltiples atributos por variante**: crear/editar con 2+ atributos a la vez — ok.
- **Vaciar un atributo ya cargado**: al editar una variante con 2 atributos y enviar solo 1 (omitiendo el otro), `updateProduct` hace `deleteMany` + `createMany` reemplazando el set completo — el atributo omitido se borra correctamente, no queda huérfano.
- **Reemplazar una variante** (editar el producto quitando una variante y agregando una nueva sin `id`): la variante vieja se soft-elimina (`isActive: false`) correctamente y la nueva se crea con sus atributos.
- **Bug encontrado**: al soft-eliminar una variante, sus filas de `ProductVariantAttribute` quedaban huérfanas para siempre (la variante nunca vuelve a aparecer por el filtro `isActive: true`, pero las filas de atributo seguían en la base sin ningún propósito). **Fix**: `updateProduct` ahora borra `ProductVariantAttribute` de la variante al soft-eliminarla.
- **Importación CSV**: no se tocó ningún código de `csv-import.service.ts` en ninguno de los dos fixes — es un path completamente separado. Se hizo un smoke test end-to-end (crear producto vía CSV con atributos + stock inicial) para confirmar que sigue sin regresión.
- **Permiso `PRODUCTS_WRITE`/`PRODUCTS_DELETE`**: se había documentado como gap abierto en una versión vieja de este archivo — es información desactualizada, el router ya los exige desde el batch P0 de seguridad (commit `e0c8711`). Corregido en la sección "Permisos" arriba.

Se agregó `src/__tests__/product.service.test.ts` (10 tests) cubriendo `createProductWithVariants`/`updateProduct`: persistencia de `size`/`color`, creación/reemplazo/vaciado de atributos, alta de variante nueva en edición, y soft-delete con limpieza de atributos huérfanos — para que estos casos queden como regresión automatizada y no dependan de verificación manual futura.

## Fix 2026-07-16 (cont.) — aislamiento multi-tenant de `attributeId` + más cobertura

Se identificó y cerró un gap real: `ProductVariantAttribute` no tiene `companyId` propio (solo `variantId`/`attributeId`), y ni `createProductWithVariants` ni `updateProduct` validaban que el `attributeId` recibido perteneciera a la empresa del usuario autenticado. Un request con un `attributeId` de otra empresa se aceptaba igual — el `ProductVariantAttribute` quedaba cross-tenant, y al listar la variante se filtraba el nombre/tipo/opciones del `Attribute` ajeno.

**Fix**: `assertAttributesBelongToCompany()` en `product.service.ts` valida, dentro de la misma transacción, que todos los `attributeId` referenciados existan y pertenezcan a `companyId` — si no, lanza `INVALID_ATTRIBUTE` (mapeado a `400` en el controller). **Verificado con dos empresas reales en la base de dev**: crear un producto en la empresa A referenciando un `Attribute` de la empresa B es rechazado, y no queda ningún producto huérfano creado.

También se cerró el resto de la cobertura pendiente:
- **Permisos a nivel HTTP**: `src/__tests__/products.permissions.test.ts` (supertest, DB real, sin mocks) — confirma que un usuario `SELLER` (sin `PRODUCTS_WRITE`/`PRODUCTS_DELETE` por default) recibe `403` en `POST`/`PATCH`/`DELETE`, y que un `OWNER` puede crear (`201`). Es la primera vez que este router se prueba con una request HTTP real en vez de confiar en que el middleware está enchufado.
- **Atributo tipo `NUMBER`**: solo se había probado `SELECT`/`TEXT` — se agregó test de componente (`VariantManager.test.tsx`) y verificación contra la base real.
- **Componentes de UI**: se agregó `VariantManager.test.tsx` (13 tests, React Testing Library) cubriendo modo legacy vs flexible, tipos `SELECT`/`TEXT`/`NUMBER`, y que los callbacks (`onAdd`/`onUpdate`/`onUpdateAttribute`/`onRemove`) se llaman con los argumentos correctos. Antes la única verificación de estos componentes era manual en el navegador.
- **Regresión del resto del roadmap de la sesión**: se agregaron tests para fixes anteriores que solo se habían verificado una vez con scripts descartables — `purchase-order.service.test.ts` (impuesto por item, recepción fraccionaria con redondeo de stock, restricción de transición de status), `stock-transfer.service.test.ts` (cancelación), `document.service.test.ts` (`update()` ya no exige `DRAFT`), `auto-journal.service.test.ts` (asiento de cobro de AR, Caja vs Banco según método de pago).
