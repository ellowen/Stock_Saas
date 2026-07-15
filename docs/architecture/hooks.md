# Hooks

Convención confirmada: un hook de datos por módulo complejo (`useSales`, `useCart`, `useStock`, `useReports`), ubicado en `pages/<modulo>/hooks/`. Responsabilidad del hook: fetch inicial, `loading`/`error` state, funciones de mutación que llaman a la API (vía `authFetch`) y refrescan el estado local tras el éxito.

Hooks verdaderamente transversales viven fuera de `pages/`, ej. `usePushNotifications` (usado por Settings y por el propio registro de notificaciones push del navegador).

No se confirmó una convención de testing de hooks (¿se testean con `renderHook` de RTL?) en esta ronda — a verificar si se agregan tests nuevos para hooks.
