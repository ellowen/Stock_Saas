import { useRef, useState, useCallback } from "react";
import html2canvas from "html2canvas";
import type { DocumentData, CompanyInfo } from "./DocumentTemplate";

export function usePrintDocument() {
  const templateRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const captureCanvas = useCallback(async (): Promise<HTMLCanvasElement | null> => {
    const el = templateRef.current;
    if (!el) return null;
    return html2canvas(el, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });
  }, []);

  const printDocument = useCallback(async () => {
    setIsGenerating(true);
    try {
      const canvas = await captureCanvas();
      if (!canvas) return;
      const dataUrl = canvas.toDataURL("image/png");
      const w = window.open("", "_blank", "noopener");
      if (w) {
        w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
          body{margin:0;padding:0;background:#fff;}
          img{width:100%;max-width:794px;display:block;margin:0 auto;}
          @media print{body{margin:0;}}
        </style></head><body><img src="${dataUrl}"></body></html>`);
        w.document.close();
        w.focus();
        w.onload = () => setTimeout(() => w.print(), 300);
      }
    } finally {
      setIsGenerating(false);
    }
  }, [captureCanvas]);

  const downloadPDF = useCallback(
    async (filename = "documento.pdf") => {
      setIsGenerating(true);
      try {
        const canvas = await captureCanvas();
        if (!canvas) return;

        const { jsPDF } = await import("jspdf");
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgRatio = canvas.height / canvas.width;
        const imgHeight = pageWidth * imgRatio;

        if (imgHeight <= pageHeight) {
          pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, pageWidth, imgHeight);
        } else {
          // Multi-page support
          let yOffset = 0;
          const pxPerMm = canvas.width / pageWidth;
          while (yOffset < canvas.height) {
            const sliceHeight = Math.min(pageHeight * pxPerMm, canvas.height - yOffset);
            const sliceCanvas = document.createElement("canvas");
            sliceCanvas.width = canvas.width;
            sliceCanvas.height = sliceHeight;
            const ctx = sliceCanvas.getContext("2d");
            ctx?.drawImage(canvas, 0, -yOffset);
            if (yOffset > 0) pdf.addPage();
            pdf.addImage(sliceCanvas.toDataURL("image/png"), "PNG", 0, 0, pageWidth, (sliceHeight / pxPerMm));
            yOffset += sliceHeight;
          }
        }

        pdf.save(filename);
      } finally {
        setIsGenerating(false);
      }
    },
    [captureCanvas]
  );

  return { templateRef, printDocument, downloadPDF, isGenerating };
}

export type { DocumentData, CompanyInfo };
