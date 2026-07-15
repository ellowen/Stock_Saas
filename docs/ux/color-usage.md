# Color Usage

Ver `DESIGN_SYSTEM.md` sección "Paleta" para la tabla completa y el problema real de dos sistemas de acento (`indigo-*` vs. `primary-*`) conviviendo en la app.

## Regla práctica al escribir una pantalla nueva

Antes de escribir un botón de acción primaria, revisar qué usa una pantalla ya existente del mismo tipo de flujo — hoy la única forma de saber si "toca" `indigo-600` o `primary-600` es mirar código vecino, porque ambos están en uso real y ninguno es objetivamente "el correcto" todavía (eso requiere una decisión explícita, ver `ROADMAP.md` P2).

## Semántica de color (sí consistente en todo el código)

`emerald-*` éxito, `amber-*` advertencia, `red-*` peligro/error, `slate-*` neutro. Esta parte del sistema **no** tiene la inconsistencia del acento — se respeta parejo en todos los módulos investigados.
