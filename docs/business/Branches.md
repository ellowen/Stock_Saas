# Business Rules — Branches

Ver `modules/Branches.md`. Una sucursal es la unidad de scoping operativo dentro de una empresa: stock, ventas, empleados y usuarios pueden atarse a una sucursal específica (`branchId`) o, en el caso de usuarios, quedar sin asignación (`null`) para tener acceso a todas. No hay jerarquía entre sucursales (ninguna es "casa central" con privilegios especiales sobre las demás a nivel de datos) — todas son pares entre sí, la diferenciación de rol viene del usuario, no de la sucursal.
