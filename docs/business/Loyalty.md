# Business Rules — Loyalty (Fidelización)

**No implementado.** No existe en el schema ni en el código ningún concepto de puntos, niveles de cliente frecuente, ni beneficios acumulativos por historial de compra. `Customer.sales[]` permite calcular `totalSpent` (ver `modules/Customers.md`, usado hoy solo para mostrar historial), pero no hay ninguna lógica de negocio que lo convierta en beneficios. Sería una feature nueva completa si se decide construirla.
