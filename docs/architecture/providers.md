# Providers

Los 3 contexts (`AuthContext`, `ToastContext`, `ThemeContext`) se proveen envolviendo el árbol de la app en `App.tsx` o el `main.tsx` de entrada (confirmar orden exacto de anidamiento si se agrega un provider nuevo — no releído en detalle en esta ronda). No hay providers de librerías externas más allá de React Router — sin `QueryClientProvider` (no hay React Query), sin `Provider` de Redux/Zustand (no aplica, ver `STATE_MANAGEMENT.md`).
