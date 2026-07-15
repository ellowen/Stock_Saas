# Payroll — Liquidación de sueldos

## Propósito

Calcular y pagar sueldos de empleados con reglas específicas de Argentina (aportes de ley + retenciones configurables).

## Reglas de negocio

Aportes fijos de ley (empleado): Jubilación 11%, Obra Social 3%, INSSJP/PAMI 3%. Aportes patronales: Jubilación 16%, INSSJP/PAMI 2%, Obra Social 6%. Estos porcentajes están **hardcodeados** en el código/UI, no configurables. Dos tasas sí son configurables por empresa: **ART patronal (%)** y **Cuota sindical (%)** (`Company.artRate`/`unionRate`, gestionadas en `Settings.md` tab Payroll). `deductJubilacion`, `deductObraSocial`, `deductInssjp`, `deductSindicato` son flags booleanos por liquidación individual — permiten excluir una deducción puntual si corresponde.

## Workflow

Alta de `Employee` → generar `Payroll` del período (mensual/quincenal según `PayrollPeriodType`) → el cálculo aplica los porcentajes fijos + las tasas configurables según los flags de deducción activos → `PayrollStatus` (pendiente/confirmado/pagado) → al pagar, si `accountingEnabled`, dispara `AutoJournalService.onPayrollPaid`. `PayrollAdvance` permite registrar adelantos que se descuentan de la liquidación del período.

## UX / Frontend

Vista de liquidaciones por período, con resumen de "sueldos del mes" también visible como widget en el Dashboard (condicionado a `EMPLOYEES_VIEW`).

## Navegación

`/app/payroll`, ícono `IconCash`, requiere `EMPLOYEES_VIEW` (mismo permiso que el módulo Employees — no tiene uno propio separado para "ver" vs. "gestionar" sueldos más allá de `EMPLOYEES_WRITE`).

## Permisos

`payrolls.router.ts` usa `requirePermission` correctamente (`EMPLOYEES_VIEW` para lectura, `EMPLOYEES_WRITE` para escritura) — uno de los módulos con enforcement de backend bien aplicado, junto con Employees, Accounting y Promotions. `EMPLOYEES_WRITE` es `false` por default incluso para MANAGER, solo OWNER.

## Tablas / Modelo

`Payroll` (`deductJubilacion, deductObraSocial, deductInssjp, deductSindicato, patronalJubilacion, patronalInssjp, patronalObraSocial, patronalArt`, más montos calculados), `PayrollAdvance`.

## Relaciones

`Employee.payrolls[]`. Genera asiento contable automático al pagar (ver `modules/Accounting.md`).

## Mejoras futuras

No se re-auditó en esta ronda de investigación específica (los 3 agentes de research cubrieron los módulos restantes, no este, que ya se había verificado end-to-end en la Fase 5 de este mismo proyecto). Si se retoma, confirmar que los porcentajes fijos de ley siguen vigentes (cambian con la legislación argentina) y evaluar si deberían ser configurables en vez de hardcodeados, dado que la legislación laboral cambia con el tiempo.

## Problemas conocidos

Ninguno nuevo en esta ronda — módulo ya verificado end-to-end en la Fase 5 histórica del proyecto (ver `PROMPT-FASE5.md`).

## Preguntas abiertas

¿Los porcentajes fijos de ley (11%/3%/3% empleado, 16%/2%/6% patronal) deberían moverse a configuración por empresa o por período, dado que la legislación argentina los actualiza periódicamente? Hoy un cambio de ley requeriría un deploy de código.
