# Employees — Legajo de empleados

## Propósito

Maestro de empleados de la empresa, base para Payroll.

## Reglas de negocio

`EmployeeStatus` y `ContractType` como enums (valores exactos a confirmar en detalle si se retoma este módulo — no se releyó el schema completo de estos dos enums en esta ronda). Un `Employee` pertenece a una `Branch`.

## Workflow

Alta de legajo → asignación a sucursal → base para generar liquidaciones de sueldo periódicas (ver `modules/Payroll.md`).

## UX / Frontend

`EmployeesPage.tsx` — CRUD de legajos, probablemente con tabs o filtro por sucursal/estado (no re-verificado en detalle en esta ronda).

## Navegación

`/app/employees`, ícono `IconBriefcase`, requiere `EMPLOYEES_VIEW`.

## Permisos

`employees.router.ts` usa `requirePermission("EMPLOYEES_VIEW"/"EMPLOYEES_WRITE")` correctamente — uno de los módulos de referencia para enforcement de backend bien hecho, junto con Payroll/Accounting/Promotions.

## Tablas / Modelo

`Employee` (`branchId`, datos personales, `status`, `contractType`) — relación 1-N con `Payroll`/`PayrollAdvance`.

## Relaciones

Ver `modules/Payroll.md`.

## Mejoras futuras

No se re-auditó a fondo en esta ronda (ya verificado en Fase 5 histórica). Si se retoma, aplicar el mismo nivel de detalle que se aplicó a los módulos investigados en esta ronda (confirmar enums exactos, componentes de UI, bugs si los hay).

## Problemas conocidos

Ninguno nuevo en esta ronda.

## Preguntas abiertas

Ninguna pendiente distinta de las ya cubiertas en `modules/Payroll.md`.
