# TESTING

## Stack

- **Backend**: Jest + Supertest, comando `cross-env NODE_ENV=test jest --runInBand` (secuencial, no paralelo — evita condiciones de carrera entre tests que comparten la misma base de datos de test).
- **Frontend**: Vitest + React Testing Library.

## Qué está cubierto (según el historial, commit `02c0d56 "feat: tests, audit log..."` introdujo la primera tanda)

No se re-corrió la suite completa en esta ronda de documentación para confirmar el conteo actual de tests — el número exacto puede haber cambiado desde la última verificación end-to-end de Fase 5. Antes de citar una cifra específica de tests pasando, correr:
```
cd backend && npm test
cd frontend && npm run test
```

## Cobertura real vs. hallazgos de esta investigación

Ninguno de los bugs/inconsistencias encontrados en esta ronda de documentación (ver `modules/*.md` y `SECURITY.md`) tiene un test que lo hubiera detectado — ejemplos concretos:
- La doble contabilización del asiento contable al recibir una OC en tandas parciales (`modules/Purchases.md`).
- La falta de `requirePermission` en la mayoría de los routers (`SECURITY.md`) — un test de "un SELLER no puede ajustar inventario" fallaría hoy si existiera.
- El `ILIKE` en una query MySQL (`modules/Inventory.md`) — rompería en runtime, no en un test si la suite no ejercita esa combinación de filtros.

Esto no es una crítica al esfuerzo de testing existente, es una observación real: la suite cubre el camino feliz de los flujos centrales (ventas, auth, permisos básicos), no las combinaciones de edge case que este research encontró leyendo código con atención. Es una fuente concreta de próximos tests a escribir, priorizada por el impacto de cada bug (ver `ROADMAP.md`).

## Convención

Tests de backend junto al código que prueban (`*.test.ts` o carpeta `__tests__`, confirmar convención exacta al tocar un service). No se investigó en esta ronda la convención exacta de ubicación/naming — completar al escribir tests nuevos siguiendo el patrón de archivos ya existentes en el mismo módulo.
