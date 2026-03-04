import { jsPDF } from "jspdf";
import { applyPlugin } from "jspdf-autotable";

// En ESM/Vite el plugin no se aplica solo a window.jsPDF; hay que aplicarlo explícitamente.
applyPlugin(jsPDF);

export { jsPDF };
