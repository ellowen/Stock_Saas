# Business Rules — Products

Ver `modules/Products.md` para el detalle técnico completo. Resumen de negocio: un producto agrupa variantes; el producto en sí no tiene precio ni stock, ambos viven en la variante. Categoría y marca son texto libre (`category?`, `brand?`), no catálogos controlados con su propia tabla — no hay un modelo `Category`/`Brand` dedicado, son strings repetidos en cada producto. Esto significa que "Remeras" y "remeras" contarían como categorías distintas si no se normaliza en la UI (a verificar si hay alguna normalización de mayúsculas/espacios al guardar).
