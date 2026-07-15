# Dashboard — Resumen del día

## Propósito

Pantalla de aterrizaje con KPIs del día y accesos rápidos, visible para todos los roles.

## Reglas de negocio

`GET /analytics/dashboard` sin gate de rol/permiso — todos los usuarios ven el mismo resumen (ventas/ingresos hoy vs. ayer, stock total, alertas de stock bajo con umbral por defecto de 5 unidades si no hay `minStock` configurado, últimas 6 ventas no canceladas, resumen de sueldos del período si aplica).

## Workflow

Carga única al montar la página, sin refetch periódico automático. El toast de "stock bajo" se dispara una sola vez por carga (`useRef`), no se repite en refrescos manuales.

## UX / Frontend

`DashboardPage.tsx`: 4 KPI cards, gráficos Recharts (área de ingresos 7 días, barras de ventas 7 días), widget de ventas recientes, widget de sueldos del mes (solo si `hasPermission("EMPLOYEES_VIEW")`), `QuickActions` con botones condicionados por permiso (`PURCHASES_MANAGE` → "Nueva OC", `REPORTS_VIEW` → "Reportes"). Banner ámbar de stock bajo con link a Inventario si hay alertas.

También existe `GET /analytics/alerts` (campana de notificaciones, separada del dashboard) que agrega stock bajo + sueldos pendientes + lotes por vencer (≤7 días) + cuentas por cobrar vencidas.

## Navegación

`/app/dashboard`, ícono `IconHome`, sin permiso requerido (todos los roles).

## Permisos

Ninguno a nivel de endpoint — es información agregada, no de detalle sensible por sí sola.

## Componentes

`StatCard` (KPIs), gráficos Recharts, tabla de ventas recientes.

## Mejoras futuras

Evaluar si el resumen de sueldos debería estar condicionado también en el widget (ya lo está) y si el dashboard necesita algún tipo de personalización por rol más allá de ocultar el widget de sueldos (ej. un cajero quizás preferiría ver su propio ranking de ventas del día en vez de un agregado de toda la empresa).

## Problemas conocidos

Ninguno grave encontrado en esta ronda — es el módulo más simple y de solo lectura del sistema.

## Preguntas abiertas

¿Vale la pena diferenciar el contenido del dashboard por rol de negocio (cajero vs. dueño), en vez de mostrar siempre el mismo resumen agregado a todos?
