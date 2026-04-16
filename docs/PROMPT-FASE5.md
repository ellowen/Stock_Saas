# PROMPT-FASE5 — Empleados, Sueldos y Contabilidad Argentina

> Referencia de implementación punto a punto. Leer este archivo al inicio de cada sesión de Fase 5.

---

## Estado de tareas

| # | Tarea | Estado |
|---|-------|--------|
| 5.1 | ABM de Empleados | ⬜ Pendiente |
| 5.2 | Liquidación de sueldos (Argentina) | ⬜ Pendiente |
| 5.3 | Registro de pagos de sueldos y SAC | ⬜ Pendiente |
| 5.4 | Plan de cuentas contables | ⬜ Pendiente |
| 5.5 | Asientos contables manuales y automáticos | ⬜ Pendiente |
| 5.6 | Libro IVA Ventas / Compras | ⬜ Pendiente |
| 5.7 | Reportes contables (Diario, Mayor, Balance) | ⬜ Pendiente |

Orden: RRHH primero (5.1–5.3), luego contabilidad (5.4–5.7).

---

## 5.1 — ABM de Empleados

### Objetivo
Registrar todos los empleados del local con su información laboral y personal.

### DB

```prisma
model Employee {
  id            Int              @id @default(autoincrement())
  companyId     Int              @map("company_id")
  branchId      Int?             @map("branch_id")
  firstName     String           @map("first_name")
  lastName      String           @map("last_name")
  cuil          String?          // CUIL argentino (XX-XXXXXXXX-X)
  email         String?
  phone         String?
  address       String?
  position      String?          // Cargo / puesto
  category      String?          // Categoría del convenio colectivo
  hireDate      DateTime         @map("hire_date")
  terminationDate DateTime?      @map("termination_date")
  status        EmployeeStatus   @default(ACTIVE)
  contractType  ContractType     @default(FULL_TIME)
  grossSalary   Decimal          @db.Decimal(10,2) @map("gross_salary") // sueldo bruto mensual base
  bankAccount   String?          @map("bank_account")
  cbu           String?          // CBU para transferencias
  notes         String?
  createdAt     DateTime         @default(now()) @map("created_at")
  updatedAt     DateTime         @updatedAt @map("updated_at")
  company       Company          @relation(fields: [companyId], references: [id])
  branch        Branch?          @relation(fields: [branchId], references: [id])
  payrolls      Payroll[]
  @@map("employees")
}

enum EmployeeStatus {
  ACTIVE
  INACTIVE
  ON_LEAVE      // licencia
}

enum ContractType {
  FULL_TIME     // relación de dependencia tiempo completo
  PART_TIME     // tiempo parcial
  TEMPORARY     // contrato a plazo fijo
  TRIAL         // período de prueba (3 meses)
}
```

### Backend
- `GET /api/employees` → lista empleados activos/inactivos de la empresa
- `POST /api/employees` → crear empleado
- `GET /api/employees/:id` → detalle + historial de liquidaciones
- `PATCH /api/employees/:id` → actualizar (incluye cambio de sueldo base)
- `DELETE /api/employees/:id` → soft delete (status=INACTIVE + terminationDate)

### Frontend
- Nueva página `/app/employees` → `EmployeesPage.tsx`
- Lista con nombre, cargo, sueldo bruto, estado, sucursal
- Modal para crear/editar empleado (formulario completo)
- Badge de estado (Activo / Inactivo / En licencia)
- Filtros por sucursal y estado
- Link al historial de liquidaciones del empleado

### i18n
`employees.title`, `employees.new`, `employees.firstName`, `employees.lastName`,
`employees.cuil`, `employees.position`, `employees.hireDate`, `employees.grossSalary`,
`employees.contractType`, `employees.status`, `employees.cbu`, `employees.statusACTIVE`,
`employees.statusINACTIVE`, `employees.statusON_LEAVE`

---

## 5.2 — Liquidación de sueldos (Argentina)

### Objetivo
Generar el recibo de sueldo mensual de cada empleado con los cálculos correctos según legislación argentina.

### Conceptos de Argentina

**Deducciones del empleado (aportes):**
| Concepto | % sobre bruto |
|---------|--------------|
| Jubilación (ANSES) | 11% |
| Obra social | 3% |
| INSSJP (PAMI) | 3% |
| Sindicato (opcional) | 2-3% |
| Cuota sindical | variable |
| **Total típico** | ~17-18% |

**Aportes patronales (costo empresa):**
| Concepto | % sobre bruto |
|---------|--------------|
| Jubilación patronal | 16% |
| INSSJP patronal | 2% |
| Obra social patronal | 6% |
| ART (riesgo trabajo) | variable (~2-4%) |
| Fondo nacional empleo | 0.5% |
| **Total típico** | ~25-27% |

**Otros conceptos:**
- **SAC (Aguinaldo)**: 50% del mejor sueldo del semestre. Se paga en junio y diciembre.
- **Horas extras**: 50% recargo (días hábiles), 100% (feriados/domingos)
- **Adicional por antigüedad**: 1% por año trabajado (depende del convenio)
- **Presentismo**: porcentaje por asistencia perfecta (depende del convenio)
- **Vacaciones**: días según antigüedad (14/21/28/35 días por año)

### DB

```prisma
model Payroll {
  id             Int            @id @default(autoincrement())
  companyId      Int            @map("company_id")
  employeeId     Int            @map("employee_id")
  period         String         // "2025-04" (año-mes)
  periodType     PayrollPeriodType @default(MONTHLY)

  // Remuneraciones (suma = grossTotal)
  basicSalary    Decimal        @db.Decimal(10,2) @map("basic_salary")
  extraHours     Decimal        @default(0) @db.Decimal(10,2) @map("extra_hours")
  bonus          Decimal        @default(0) @db.Decimal(10,2) // SAC / aguinaldo
  otherEarnings  Decimal        @default(0) @db.Decimal(10,2) @map("other_earnings")
  grossTotal     Decimal        @db.Decimal(10,2) @map("gross_total")

  // Deducciones empleado
  deductJubilacion  Decimal     @db.Decimal(10,2) @map("deduct_jubilacion")   // 11%
  deductObraSocial  Decimal     @db.Decimal(10,2) @map("deduct_obra_social")  // 3%
  deductInssjp      Decimal     @db.Decimal(10,2) @map("deduct_inssjp")       // 3%
  deductSindicato   Decimal     @default(0) @db.Decimal(10,2) @map("deduct_sindicato")
  deductOther       Decimal     @default(0) @db.Decimal(10,2) @map("deduct_other")
  totalDeductions   Decimal     @db.Decimal(10,2) @map("total_deductions")

  // Neto a cobrar
  netSalary      Decimal        @db.Decimal(10,2) @map("net_salary")

  // Aportes patronales (costo empresa, informativo)
  patronalJubilacion  Decimal   @db.Decimal(10,2) @map("patronal_jubilacion")
  patronalInssjp      Decimal   @db.Decimal(10,2) @map("patronal_inssjp")
  patronalObraSocial  Decimal   @db.Decimal(10,2) @map("patronal_obra_social")
  patronalArt         Decimal   @default(0) @db.Decimal(10,2) @map("patronal_art")
  patronalTotal       Decimal   @db.Decimal(10,2) @map("patronal_total")

  status         PayrollStatus  @default(DRAFT)
  notes          String?
  paidAt         DateTime?      @map("paid_at")
  createdAt      DateTime       @default(now()) @map("created_at")
  updatedAt      DateTime       @updatedAt @map("updated_at")

  company        Company        @relation(fields: [companyId], references: [id])
  employee       Employee       @relation(fields: [employeeId], references: [id])
  journalEntry   JournalEntry?  // asiento contable generado

  @@unique([employeeId, period])
  @@map("payrolls")
}

enum PayrollStatus {
  DRAFT      // calculado pero no confirmado
  CONFIRMED  // aprobado, pendiente de pago
  PAID       // pagado
}

enum PayrollPeriodType {
  MONTHLY
  SAC        // liquidación de aguinaldo
  FINAL      // liquidación final (despido/renuncia)
}
```

### Backend
- `POST /api/payrolls/calculate` → Body: `{ employeeId, period, extraHours?, bonus?, otherEarnings? }` → calcula automáticamente todos los aportes y devuelve el borrador
- `POST /api/payrolls` → confirma y guarda una liquidación (status=CONFIRMED)
- `POST /api/payrolls/bulk-calculate` → calcula liquidación del mes para todos los empleados activos
- `GET /api/payrolls?period=&employeeId=&status=` → lista liquidaciones
- `GET /api/payrolls/:id` → detalle completo
- `PATCH /api/payrolls/:id` → actualizar borrador (conceptos adicionales)
- `POST /api/payrolls/:id/pay` → marcar como pagado (genera asiento contable)

### Lógica de cálculo (payroll.service.ts)
```typescript
function calculatePayroll(employee, extras) {
  const gross = employee.grossSalary + extras.extraHours + extras.bonus + extras.otherEarnings

  // Deducciones empleado
  const jubilacion = gross * 0.11
  const obraSocial = gross * 0.03
  const inssjp = gross * 0.03
  const sindicato = extras.sindicatoRate ? gross * extras.sindicatoRate : 0
  const totalDeductions = jubilacion + obraSocial + inssjp + sindicato
  const net = gross - totalDeductions

  // Aportes patronales
  const patronalJub = gross * 0.16
  const patronalInssjp = gross * 0.02
  const patronalOS = gross * 0.06
  const patronalArt = extras.artRate ? gross * extras.artRate : 0
  const patronalTotal = patronalJub + patronalInssjp + patronalOS + patronalArt

  return { gross, totalDeductions, net, patronalTotal, ... }
}
```

### Frontend
- Nueva página `/app/payroll` → `PayrollPage.tsx`
- Tab "Liquidaciones del mes": selector de período (mes/año), tabla de empleados con su estado de liquidación
- Botón "Calcular todos" para generar borradores en masa
- Modal de detalle: muestra el recibo de sueldo completo (similar a un recibo real)
- Botón "Confirmar" y "Marcar como pagado"
- Impresión del recibo de sueldo (formato A4)

---

## 5.3 — SAC, anticipos y liquidación final

### SAC (Aguinaldo)
- Se calcula automáticamente: 50% del mejor sueldo mensual del semestre
- Períodos: enero-junio (pago hasta 30 jun) y julio-diciembre (pago hasta 31 dic)
- Endpoint `POST /api/payrolls/sac` → Body: `{ employeeId, semester: "2025-1" | "2025-2" }` → calcula SAC

### Anticipo de sueldo
```prisma
model PayrollAdvance {
  id          Int      @id @default(autoincrement())
  companyId   Int      @map("company_id")
  employeeId  Int      @map("employee_id")
  amount      Decimal  @db.Decimal(10,2)
  date        DateTime
  notes       String?
  deductedIn  String?  @map("deducted_in") // período en que se descontó
  company     Company  @relation(...)
  employee    Employee @relation(...)
  @@map("payroll_advances")
}
```

### Liquidación final
- Cálculo automático de: sueldo proporcional + vacaciones no gozadas + SAC proporcional + indemnización (si es despido sin causa)
- Fórmula indemnización: 1 mes de sueldo por año trabajado (mín. 2 meses)

---

## 5.4 — Plan de cuentas contables

### Objetivo
Un plan de cuentas estándar argentino (basado en normas FACPCE) que sirva de base para los asientos contables.

### DB

```prisma
model Account {
  id          Int           @id @default(autoincrement())
  companyId   Int           @map("company_id")
  code        String        // "1.1.01", "2.1.01", etc.
  name        String        // "Caja", "IVA Crédito Fiscal", etc.
  type        AccountType
  subtype     String?       // agrupación dentro del tipo
  isParent    Boolean       @default(false) @map("is_parent")
  parentId    Int?          @map("parent_id")
  balance     Decimal       @default(0) @db.Decimal(12,2)
  isSystem    Boolean       @default(false) @map("is_system") // cuentas creadas automáticamente, no editables
  active      Boolean       @default(true)
  createdAt   DateTime      @default(now()) @map("created_at")
  parent      Account?      @relation("AccountHierarchy", fields: [parentId], references: [id])
  children    Account[]     @relation("AccountHierarchy")
  company     Company       @relation(fields: [companyId], references: [id])
  debitLines  JournalLine[] @relation("DebitAccount")
  creditLines JournalLine[] @relation("CreditAccount")
  @@unique([companyId, code])
  @@map("accounts")
}

enum AccountType {
  ASSET         // Activo (1)
  LIABILITY     // Pasivo (2)
  EQUITY        // Patrimonio neto (3)
  REVENUE       // Ingresos (4)
  EXPENSE       // Egresos (5)
}
```

### Plan de cuentas base (se inicializa al crear empresa)

```
1. ACTIVO
  1.1 Activo corriente
    1.1.01 Caja
    1.1.02 Banco cuenta corriente
    1.1.03 Banco caja de ahorro
    1.1.04 Mercaderías
    1.1.05 IVA Crédito Fiscal (compras)
    1.1.06 Deudores por ventas (cuentas corrientes)
  1.2 Activo no corriente
    1.2.01 Inmuebles
    1.2.02 Rodados
    1.2.03 Muebles y útiles

2. PASIVO
  2.1 Pasivo corriente
    2.1.01 Proveedores
    2.1.02 IVA Débito Fiscal (ventas)
    2.1.03 Sueldos a pagar
    2.1.04 Cargas sociales a pagar (ANSES, AFIP)
    2.1.05 Ingresos brutos a pagar
  2.2 Pasivo no corriente
    2.2.01 Deudas bancarias LP

3. PATRIMONIO NETO
  3.1.01 Capital social
  3.1.02 Resultados acumulados

4. INGRESOS
  4.1.01 Ventas
  4.1.02 Otros ingresos

5. EGRESOS
  5.1.01 Costo de mercaderías vendidas (CMV)
  5.1.02 Sueldos y jornales
  5.1.03 Cargas sociales patronales
  5.1.04 Alquiler
  5.1.05 Servicios (luz, agua, internet)
  5.1.06 Gastos generales
```

### Backend
- `GET /api/accounts` → devuelve el plan de cuentas en estructura árbol
- `POST /api/accounts` → crear cuenta personalizada
- `PATCH /api/accounts/:id` → editar nombre o mover en jerarquía
- `DELETE /api/accounts/:id` → solo si no tiene movimientos
- Al crear empresa → seed automático del plan de cuentas base

---

## 5.5 — Asientos contables (Libro Diario)

### Objetivo
Registrar todas las operaciones económicas del negocio. Los asientos pueden ser manuales (usuario los ingresa) o automáticos (generados por ventas, compras, sueldos).

### DB

```prisma
model JournalEntry {
  id          Int            @id @default(autoincrement())
  companyId   Int            @map("company_id")
  date        DateTime
  description String
  reference   String?        // Nro de factura, recibo, etc.
  sourceType  JournalSource? @map("source_type")
  sourceId    Int?           @map("source_id") // saleId, payrollId, purchaseOrderId, etc.
  isAutomatic Boolean        @default(false) @map("is_automatic")
  status      JournalStatus  @default(DRAFT)
  createdBy   Int            @map("created_by")
  createdAt   DateTime       @default(now()) @map("created_at")
  lines       JournalLine[]
  company     Company        @relation(fields: [companyId], references: [id])
  user        User           @relation(fields: [createdBy], references: [id])
  payroll     Payroll?       @relation(fields: [sourceId], references: [id], ...)
  @@map("journal_entries")
}

model JournalLine {
  id             Int          @id @default(autoincrement())
  journalEntryId Int          @map("journal_entry_id")
  accountId      Int          @map("account_id")
  debit          Decimal      @default(0) @db.Decimal(12,2)
  credit         Decimal      @default(0) @db.Decimal(12,2)
  description    String?
  journalEntry   JournalEntry @relation(fields: [journalEntryId], references: [id], onDelete: Cascade)
  debitAccount   Account      @relation("DebitAccount", fields: [accountId], references: [id])
  @@map("journal_lines")
}

enum JournalSource {
  SALE
  PURCHASE
  PAYROLL
  MANUAL
  SAC
  EXPENSE
}

enum JournalStatus {
  DRAFT
  POSTED    // confirmado, ya afecta saldos
}
```

### Asientos automáticos

**Por cada venta (Sale):**
```
DEBE    1.1.01 Caja (o 1.1.02 Banco si fue con tarjeta)    $total
HABER   4.1.01 Ventas                                       $subtotal
HABER   2.1.02 IVA Débito Fiscal                            $iva
```

**Por cada compra (PurchaseOrder recibida):**
```
DEBE    1.1.04 Mercaderías                                  $subtotal
DEBE    1.1.05 IVA Crédito Fiscal                           $iva
HABER   2.1.01 Proveedores                                  $total
```

**Por pago de sueldo:**
```
DEBE    5.1.02 Sueldos y jornales                           $bruto
HABER   2.1.03 Sueldos a pagar                              $neto
HABER   2.1.04 Cargas sociales a pagar                      $aportes_empleado

// Aportes patronales:
DEBE    5.1.03 Cargas sociales patronales                   $patronal_total
HABER   2.1.04 Cargas sociales a pagar                      $patronal_total
```

### Backend
- `GET /api/journal?from=&to=&source=` → lista de asientos
- `POST /api/journal` → crear asiento manual (valida que suma débitos = suma créditos)
- `GET /api/journal/:id` → detalle con líneas
- `PATCH /api/journal/:id` → editar borrador
- `POST /api/journal/:id/post` → confirmar asiento (actualiza saldos de cuentas)
- `DELETE /api/journal/:id` → solo borradores

### Frontend
- Nueva página `/app/accounting` → `AccountingPage.tsx` con tabs:
  - **Libro Diario**: lista de asientos paginada, filtro por fecha/tipo
  - **Plan de cuentas**: árbol editable
  - **Asiento manual**: formulario con líneas dinámicas (débito/crédito)

---

## 5.6 — Libro IVA (Ventas y Compras)

### Objetivo
Registro legal de IVA para presentación ante AFIP.

### Backend
- `GET /api/accounting/iva-ventas?from=&to=` → todas las ventas del período con: fecha, nro comprobante, cliente (CUIT), neto gravado, IVA 21%, IVA 10.5%, exento, total
- `GET /api/accounting/iva-compras?from=&to=` → todas las compras del período con: fecha, proveedor (CUIT), neto, IVA CF, total
- `GET /api/accounting/iva-balance?from=&to=` → IVA Débito Fiscal - IVA Crédito Fiscal = saldo a pagar/favor

### Frontend
- Tab "IVA" en AccountingPage:
  - Selector de período
  - Tabla Libro IVA Ventas
  - Tabla Libro IVA Compras
  - Resumen: Débito Fiscal / Crédito Fiscal / Saldo
  - Botón exportar a CSV (para importar en AFIP / software contable)

---

## 5.7 — Reportes contables

### Objetivo
Los tres reportes fundamentales de la contabilidad.

### Balance de Sumas y Saldos
- Lista de todas las cuentas con: suma de débitos, suma de créditos, saldo deudor, saldo acreedor
- Filtro por período
- Endpoint: `GET /api/accounting/trial-balance?from=&to=`

### Libro Mayor (por cuenta)
- Todos los movimientos de una cuenta en un período
- Saldo inicial, línea por línea, saldo final
- Endpoint: `GET /api/accounting/ledger/:accountId?from=&to=`

### Estado de Resultados
- Ingresos (cuentas tipo REVENUE) vs Egresos (tipo EXPENSE)
- Resultado del período (ganancia o pérdida)
- Endpoint: `GET /api/accounting/income-statement?from=&to=`

### Frontend
- Tab "Reportes" en AccountingPage:
  - Selector tipo de reporte + período
  - Balance de Sumas y Saldos
  - Libro Mayor (con selector de cuenta)
  - Estado de Resultados
  - Todos exportables a CSV / imprimibles

---

## Notas generales

- Porcentajes de aportes deben ser configurables en Settings (pueden cambiar por decreto)
- Al crear empresa → seed automático del plan de cuentas base (función `seedAccountsForCompany`)
- Los asientos automáticos de ventas solo se generan si la empresa tiene el módulo contable activado (toggle en Settings)
- Migración única: `add_employees_payroll_accounting`
- Tests: no requeridos en esta fase, prioridad es funcionalidad
- i18n: agregar keys en `es.json` y `en.json` en cada tarea
