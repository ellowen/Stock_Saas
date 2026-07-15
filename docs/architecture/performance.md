# Performance (arquitectura)

Ver `PERFORMANCE.md` (raíz) para el detalle completo — apunta ahí en vez de duplicar. Ángulo de arquitectura específico: el POS es el único módulo con optimización de carga deliberada y documentada (carga paralela de branch+inventory en vez de secuencial/waterfall, parte del rediseño 2026-07-11). El resto de los módulos no fue auditado con el mismo rigor de performance — es un candidato razonable para una próxima pasada, aplicando el mismo criterio que se usó en el POS (medir antes de optimizar, priorizar donde el usuario realmente espera).
