# Audit (arquitectura)

Ver `modules/Audit.md` para el detalle completo de negocio/UX. Ángulo de arquitectura: `AuditLog` es un modelo genérico bien diseñado (`before`/`after` JSON, índices por empresa+fecha y por entidad), pero la instrumentación real (llamadas a `auditService.log(...)`) es manual, dispersa, y hoy cubre solo 5 puntos del código. No existe un mecanismo automático (middleware de Prisma, decorator, etc.) que capture cambios sin que el desarrollador recuerde instrumentar cada punto — es la brecha arquitectónica central de este módulo, no un detalle de negocio.

Si se decide expandir cobertura, vale la pena evaluar un middleware de Prisma (`$use` o `$extends`) que capture automáticamente creates/updates/deletes de una lista de modelos "auditables", en vez de seguir agregando llamadas manuales módulo por módulo — sería más consistente y menos propenso a que un módulo nuevo se olvide de instrumentar su propia auditoría.
