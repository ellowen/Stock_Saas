// Re-export hook return shapes as named types for use in tab props
import type { useProducts } from "../hooks/useProducts";
import type { useStock } from "../hooks/useStock";
import type { useMovements } from "../hooks/useMovements";

export type UseProductsReturn = ReturnType<typeof useProducts>;
export type UseStockReturn = ReturnType<typeof useStock>;
export type UseMovementsReturn = ReturnType<typeof useMovements>;
