import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

type Props = {
  value: string;
  format?: "CODE128" | "EAN13" | "EAN8" | "UPC";
  width?: number;
  height?: number;
  displayValue?: boolean;
  className?: string;
};

export function Barcode({
  value,
  format = "CODE128",
  width = 2,
  height = 40,
  displayValue = true,
  className = "",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!value?.trim() || !canvasRef.current) return;
    try {
      JsBarcode(canvasRef.current, value.trim(), {
        format: format === "CODE128" ? "CODE128" : format,
        width,
        height,
        displayValue,
        margin: 4,
      });
    } catch {
      // invalid barcode value for format
    }
  }, [value, format, width, height, displayValue]);

  if (!value?.trim()) return <span className="text-slate-400 text-sm">Sin código</span>;
  return <canvas ref={canvasRef} className={className} aria-label={`Código de barras ${value}`} />;
}
