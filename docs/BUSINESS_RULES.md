# BUSINESS_RULES — Reglas transversales (no específicas de un módulo)

Reglas que atraviesan varios módulos, confirmadas en código. Las reglas específicas de un módulo viven en `docs/modules/<Modulo>.md` y `docs/business/`.

## Multi-tenancy y aislamiento

Un usuario pertenece a una sola empresa (`companyId`). Todo dato queda scoped a esa empresa; no hay ningún concepto de "compartir" datos entre empresas. Ver `SECURITY.md` para el riesgo de que esto depende de disciplina de código, no de una barrera de base de datos.

## Soft delete como default

Ninguna entidad "maestra" (Product, Customer, Supplier, Branch, User) se borra físicamente — todas usan `isActive:false`. Las excepciones son entidades que representan una *sesión de trabajo* más que un registro permanente (`StockCount` sí se puede cancelar/remover mientras está `OPEN`).

## El dinero nunca se confía al cliente

Todo cálculo que determina cuánto cobra/debe una venta (descuentos, promociones automáticas, cupones, impuestos) se recalcula server-side al confirmar, sin importar qué mostró el frontend como preview. Confirmado en `PromotionService`, `sales.service.ts`. Es el principio más sólido y consistente del proyecto.

## Planes y límites (`CompanyPlan`: FREE/PRO/ENTERPRISE)

Cada empresa nueva arranca en FREE con 90 días de trial (`trialEndsAt`). Los límites (sucursales, usuarios, productos, ventas/mes) se verifican en middleware por endpoint de creación, no de forma centralizada. **Regla real y no obvia**: una empresa FREE cuyo trial venció **no pierde acceso** — `checkSubscription` solo bloquea planes pagos con estado inactivo, nunca a FREE. El banner de "tu trial expiró" en `PlanPage.tsx` sugiere lo contrario; ver `modules/Subscription.md` para el detalle completo de esta discrepancia.

## Permisos: rol + overrides, pero enforcement desparejo

Ver `PERMISSIONS.md` para el modelo, y `SECURITY.md` para la brecha real entre lo que la UI de gestión de permisos promete y lo que el backend efectivamente exige en cada endpoint.

## Venta a crédito genera cuenta corriente automáticamente

Si una venta se registra con `paymentMethod: CREDIT` y tiene un cliente asociado, se crea un `AccountReceivable` automáticamente por el total. Si es CREDIT **sin** cliente, no se genera ningún registro de deuda — la venta queda fiada sin trazabilidad (hueco real, ver `modules/AccountsReceivable.md`).

## Documentos (facturas/remitos/etc.) son independientes de las ventas

Pese a que el schema tiene `Sale.documentId`, ningún código lo popula. Documents se crean por su cuenta desde el módulo de Documentos, sin relación real con Sales/POS hoy. Si el objetivo de producto es "una venta genera automáticamente su comprobante", esto requiere trabajo nuevo, no está implementado pese a que el campo de enlace ya existe en el schema.

## Contabilidad es opt-in por empresa

`Company.accountingEnabled` gatea si las operaciones (venta, compra recibida, sueldo pagado) generan asientos automáticos en el libro diario. Si está apagado, la app funciona igual para todo lo demás — la contabilidad no es un requisito para operar.

## Stock pertenece a la variante, nunca al producto

`Inventory.productVariantId` es la única FK de cantidad de stock. `Product` no tiene cantidad propia — es agregación de sus variantes. Cualquier feature nueva de inventario debe operar a nivel de variante×sucursal, nunca a nivel de producto directamente.
