# Inputs

`.input-minimal` es la clase base compartida por todo input/select/textarea de la app — reusar siempre en vez de estilar un input desde cero. `Select.tsx` es el wrapper de select estilizado; `SearchInput.tsx` es el input de búsqueda con debounce (~300ms, patrón repetido en Customers/Suppliers/Products).

## Inputs numéricos de cantidad/dinero

No se confirmó en esta ronda una convención única de cómo se manejan `Decimal` en inputs (¿string libre parseado al submit, o `<input type="number">` nativo con sus limitaciones conocidas de redondeo/locale?) — a verificar si se estandariza, dado que el backend es estricto con `Decimal(10,2)`/`Decimal(10,3)`.
