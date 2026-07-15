# CODING_STANDARDS

## Backend: patrón por feature

`router → controller → service`:
- **Router** (`infrastructure/http/routers/*.router.ts`): solo define rutas + middleware (`authMiddleware`, `requireRole`, `requirePermission`). No debería tener lógica — cuando la tiene (ej. algunos routers llaman servicios de auto-journal directo desde el router en vez del controller), es una excepción a documentar, no el patrón a copiar.
- **Controller** (`presentation/http/controllers/*.controller.ts`): valida el body con **Zod**, llama al service, mapea el resultado/error a HTTP. No toca Prisma directamente.
- **Service** (`application/<feature>/*.service.ts`): la única capa que llama a Prisma. Contiene la lógica de negocio real y siempre filtra por `companyId`.

**Nota real, no aspiracional**: algunos módulos (Customers, Branches) no tienen un `controller.ts` separado — la validación/mapeo vive directo en el router. Es una simplificación aceptable para CRUDs chicos, pero significa que no todo el código sigue las 3 capas al pie de la letra; al tocar uno de esos módulos, evaluar si conviene separar el controller o si el router sigue siendo suficientemente simple.

## TypeScript

`strict: true` en ambos `tsconfig.json` (backend y frontend). Sin `any` explícito como norma (no se auditó exhaustivamente si hay excepciones puntuales). Fechas como `Date`/`DateTime` de Prisma, nunca strings serializadas a mano. Montos como `Decimal` de Prisma en el backend; en el frontend llegan como string (comportamiento default de Prisma al serializar `Decimal` a JSON) y se parsean a `Number` solo para mostrar/calcular en UI — no se hacen cálculos de dinero en el frontend que definan el resultado final de una operación (eso es responsabilidad server-side, ver `PROJECT.md`).

## Naming

- Componentes React: PascalCase (`PlantCard.tsx` → en este proyecto, `CartItem.tsx`, `PaymentPanel.tsx`).
- Hooks: camelCase con prefijo `use` (`useCart.ts`, `useStock.ts`).
- Services backend: `<feature>.service.ts`, clase `<Feature>Service`.
- Enums Prisma: PascalCase singular (`PurchaseOrderStatus`), valores en SCREAMING_SNAKE (`PARTIALLY_RECEIVED`).
- Permission keys: `MODULO_ACCION` en mayúsculas (`SALES_DISCOUNT`, `TRANSFERS_APPROVE`).

## Commits

```
feat: descripción corta en español
fix: descripción corta en español
refactor: descripción corta en español
docs: descripción corta en español
chore: descripción corta en español
```
Confirmado por `git log` real del repo — se respeta consistentemente.

## Comentarios

En español para lógica de negocio (mismo criterio que el resto de los proyectos del autor). JSDoc esperable en funciones exportadas de `application/*` con reglas no obvias (ej. cálculo de aportes de sueldo); no auditado si está aplicado parejo en todo el código existente.

## Patrón de permisos al agregar un endpoint nuevo (el correcto, aunque hoy no se aplica en todos lados)

1. Definir el `PermissionKey` si es una capacidad nueva (ver `PERMISSIONS.md`, sección "Extender el sistema").
2. En el router: `router.post("/", requirePermission("KEY"), controller.create)`.
3. Si el permiso es condicional al contenido del body (ej. solo si hay descuento), chequear dentro del controller en vez del router — patrón ya usado en `sales.controller.ts`.
4. Nunca confiar solo en que el frontend oculte el botón — ver `SECURITY.md` para por qué esto importa (es, hoy, el problema más grande del código existente).
