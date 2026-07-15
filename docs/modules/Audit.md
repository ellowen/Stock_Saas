# Audit — Log de auditoría

## Propósito

Registrar quién hizo qué (crear/editar/borrar/login) para trazabilidad y cumplimiento.

## Reglas de negocio

Modelo genérico `AuditLog` (`action, entity, entityId?, before?, after?, ip?`) pensado para cubrir `CREATE|UPDATE|DELETE|LOGIN|EXPORT` sobre cualquier entidad (`User|Product|Sale|Transfer|...`, según el comentario del propio schema).

## Workflow

Se audita solo en el momento exacto en que el código llama `auditService.log(...)` — no hay instrumentación automática (ej. un middleware de Prisma) que capture todo cambio.

## UX / Frontend

`AuditPage.tsx`: filtros por Entidad (7 valores fijos en el select), Acción (5 valores), rango de fechas. Fila expandible con diff `before`/`after` coloreado (rojo/verde). Paginación simple.

## Navegación

`/app/audit`, ícono `IconShield`, requiere `AUDIT_VIEW`.

## Permisos

`GET /audit-logs` requiere `requireRole(["OWNER","MANAGER"])`.

## Tablas / Modelo

`AuditLog` — índices por `(companyId, createdAt desc)` y `(companyId, entity, entityId)`.

## Mejoras futuras

Ver `ROADMAP.md`. Decidir si vale la pena instrumentar más puntos (Products, Inventory, Sales completo, Documents, Transfers) o si el alcance actual (Login + User CRUD + creación de venta) es intencionalmente mínimo por ahora.

## Problemas conocidos

**Brecha real entre diseño y uso**: el modelo y el frontend (filtros de entidad) ya contemplan `Product`, `Transfer`, `Employee`, `Payroll`, `Document` — pero **solo existen 5 puntos de instrumentación real en todo el backend**: `LOGIN`/User (login exitoso), `CREATE`/`Sale`, `CREATE`/`UPDATE`/`DELETE` de `User`. Filtrar por cualquiera de esas otras entidades en la UI de Auditoría hoy **nunca devuelve resultados**, porque esos eventos simplemente no se generan. No es un bug de la pantalla — es trabajo de instrumentación pendiente en cada módulo.

`AuditPage.tsx` usa `fetch()` crudo en vez de `authFetch` (mismo patrón encontrado en `CustomersPage.tsx`) — no se beneficia del manejo automático de sesión expirada.

## Preguntas abiertas

¿Cuál es el nivel de auditoría que el negocio necesita realmente? Auditar todo (cada `UPDATE` de cada entidad) genera mucho volumen y antes de instrumentar más módulos vale la pena decidir la prioridad: ¿operaciones de dinero primero (ventas, pagos, ajustes de stock, sueldos), o cobertura pareja de todo?
