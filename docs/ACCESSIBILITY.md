# ACCESSIBILITY — Estado real (honesto, no aspiracional)

No hubo un audit de accesibilidad documentado en el historial del proyecto. Este documento registra lo que se puede confirmar del código, no supone conformidad WCAG.

## Lo que sí existe

- **Soporte de teclado en el POS**: parte del rediseño (commit `ec07751 "feat: POS shortcuts visuales, qty inline..."`) agregó atajos visuales y edición de cantidad inline navegable por teclado — coherente con el requisito de que un lector de código de barras funciona como un teclado (Barcode+ENTER). Esto es soporte de teclado orientado a velocidad de cajero, no necesariamente a accesibilidad para personas con discapacidad motriz — son objetivos relacionados pero no idénticos.
- **Modo oscuro** (`.dark` vía Tailwind) — ayuda a fotosensibilidad/preferencia visual, no es en sí un feature de accesibilidad formal (no depende de `prefers-color-scheme` del sistema operativo, es un toggle manual — a confirmar en `ThemeContext.tsx`).

## Lo que no se confirmó / probablemente falta

- No se auditó uso de atributos ARIA en los componentes de `components/ui/` (`Modal.tsx`, `Select.tsx`, `DataTable.tsx`) — a revisar si los modales manejan foco (focus trap) y `aria-modal`, y si los selects/tablas tienen roles/labels apropiados para lectores de pantalla.
- No se confirmó contraste de color verificado formalmente (ej. `slate-400` sobre fondo claro para texto secundario puede quedar bajo el mínimo WCAG AA en algunos casos) — requiere medición real, no asumida.
- No hay skip-links ni landmarks (`<nav>`, `<main>`) confirmados en `AppLayout.tsx`.
- Los íconos vendorizados a mano (`Icons.tsx`) — no se confirmó si llevan `aria-hidden` cuando son decorativos o `aria-label` cuando son el único contenido de un botón (ej. un botón de ícono solo, sin texto).

## Recomendación

Antes de reclamar cualquier nivel de conformidad (WCAG A/AA), correr una herramienta automatizada (axe, Lighthouse accessibility) sobre las pantallas principales (POS, Inventario, Ventas) y registrar acá los resultados reales. Este documento debería reemplazarse por hallazgos medidos, no por inferencia de que "tiene soporte de teclado en el POS" implica accesibilidad general.
