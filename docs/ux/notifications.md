# Notifications

Dos sistemas distintos, no confundir:

1. **Toast** (`ToastContext`) — feedback transitorio de una acción del usuario (guardado exitoso, error de validación). Nunca usar `alert()`.
2. **Push notifications del navegador** (`usePushNotifications`, `web-push` en el backend) — alertas persistentes fuera de la pestaña activa (ej. resumen de ventas, configurable en Settings tab Company).

Además existe `GET /analytics/alerts` (campana de notificaciones dentro de la app, no confundir con push del navegador) que agrega stock bajo + sueldos pendientes + lotes por vencer + cuentas por cobrar vencidas — ver `modules/Dashboard.md`.
