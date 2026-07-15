# Subscription — Plan y facturación

## Propósito

Gestionar el plan de la empresa (FREE/PRO/ENTERPRISE), límites de uso, checkout y portal de facturación vía Stripe o MercadoPago.

## Reglas de negocio

Toda empresa nueva arranca `FREE`, `subscriptionStatus: trialing`, `trialEndsAt = +90 días`. Límites por plan (sucursales, usuarios, productos, ventas/mes) verificados por middleware en cada endpoint de creación relevante, devolviendo `402 PLAN_LIMIT_REACHED`.

| Plan | Sucursales | Usuarios | Productos | Ventas/mes |
|---|---|---|---|---|
| FREE | 1 | 5 | 1000 | 100 |
| PRO | 5 | ∞ | ∞ | ∞ |
| ENTERPRISE | ∞ | ∞ | ∞ | ∞ |

## Workflow

`checkSubscription` (middleware global, excepto `/auth`, `/billing`, `/push`, `/protected`, `/health`) decide acceso: plan pago + status activo/trialing → OK; `trialEndsAt` futuro → OK; **`plan === FREE` → OK siempre, sin mirar `trialEndsAt`**. Solo bloquea (402 `SUBSCRIPTION_EXPIRED`) a un plan pago con `subscriptionStatus` inactivo y trial ya vencido.

Checkout: `POST /billing/subscribe {plan, provider}` arma un link (Stripe Checkout o MercadoPago PreApproval). Webhooks actualizan `plan`/`subscriptionStatus`/`currentPeriodEnd` de forma asíncrona.

## UX / Frontend

`PlanPage.tsx`: banner de trial activo/vencido, barras de uso por recurso, botón "Administrar suscripción" (Stripe Customer Portal, si `hasStripe`), grilla de planes con `CheckoutModal` (elige MP o Stripe), y una función de exportación de datos a Excel (backup de productos/inventario/ventas del último año) que vive acá aunque no es estrictamente de billing.

## Navegación

`/app/plan`, ícono `IconCurrency` (compartido con Cta. corriente), requiere `SETTINGS_MANAGE`.

## Permisos

`POST /billing/cancel` exige explícitamente `role === "OWNER"`. El resto de los endpoints de billing solo exigen estar autenticado.

## Tablas / Modelo

Campos en `Company`: `plan, trialEndsAt, subscriptionStatus, stripeCustomerId, stripeSubscriptionId, mpSubscriptionId, currentPeriodEnd`.

## Relaciones

`getPlanUsage()` agrega conteos de `Branch`, `User`, `Product`, `Sale` — alimenta tanto los middlewares de límite como `GET /billing/usage` (consumido por `PlanPage`).

## Mejoras futuras

Ver `ROADMAP.md`. Corregir el copy de "tu trial expiró, elegí un plan" para que coincida con el comportamiento real (FREE nunca se bloquea). Corregir `checkBranchLimit` para que no cuente sucursales inactivas (afecta directamente la experiencia de plan FREE, ver `modules/Branches.md`).

## Problemas conocidos

**El banner de trial vencido en `PlanPage.tsx` es engañoso**: se muestra si `trialEndsAt < now && plan === "FREE"`, dando a entender que el acceso se corta, pero `checkSubscription` **nunca bloquea a FREE** — el mensaje no coincide con el comportamiento real del sistema. Solo se bloquea un plan de pago que perdió el estado activo (ej. `past_due` tras fallo de cobro) y cuyo trial ya venció (caso raro, porque un plan pago normalmente no tiene trial activo relevante).

## Preguntas abiertas

¿La intención de producto es que FREE se bloquee al vencer el trial (forzando upgrade), o que FREE sea gratis para siempre con límites bajos (freemium clásico)? El código hoy implementa la segunda opción; el copy del frontend sugiere la primera. Definir esto resuelve la inconsistencia de una vez — no es un bug a "arreglar" sin antes decidir cuál es el comportamiento deseado.
