# Folders — Convención de carpetas

Ver los árboles completos en `ARCHITECTURE.md`. Resumen de la regla de decisión:

- **Backend**: ¿es lógica de negocio? → `application/<feature>/`. ¿Es infraestructura (HTTP, email, cron)? → `infrastructure/`. ¿Es parsing/validación/mapeo HTTP? → `presentation/http/controllers/`.
- **Frontend**: ¿el estado/UI es específico de una sola pantalla? → vive dentro de `pages/<modulo>/`. ¿Se comparte entre 2+ módulos? → sube a `components/` o `lib/`. ¿Es verdaderamente global (auth, toast, theme)? → `contexts/`.

No hay un archivo `folders.md` previo que contradiga esto — es la convención observada consistentemente en el código real, no una regla escrita antes de la implementación.
