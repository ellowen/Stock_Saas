# Propuesta de rediseño – Pantalla de login

## Estado actual

- Fondo `slate-50`, card centrada con título "Clothing Stock", subtítulo, formulario (usuario, contraseña, "Recordarme"), botón "Entrar" y link "Crear cuenta".
- Mensajes: error en rojo, éxito post-registro en verde.
- Funcional: cumple su propósito; falta identidad de marca y sensación de producto "premium".

---

## Objetivos

1. **Identidad**: Alinear el login con la app (nombre "GIRO" si se usa en el panel, o mantener "Clothing Stock" con un estilo más definido).
2. **Confianza**: Que se sienta seguro y claro (campos bien etiquetados, mensajes claros).
3. **Consistencia**: Mismo lenguaje visual que el resto (colores, bordes, tipografía) y soporte para modo oscuro si se extiende a la landing/login.
4. **UX**: Accesibilidad (labels, focus), link "Volver al inicio", y opcional "¿Olvidaste tu contraseña?" aunque no esté implementado aún.

---

## Opciones de diseño

### Opción A – Centrado mejorado (recomendada)

- **Layout**: Pantalla centrada, sin split. Card con sombra suave y borde, fondo de la página con un degradado muy sutil (slate-50 a blanco) o patrón discreto.
- **Marca**: Logo o nombre "GIRO" / "Clothing Stock" arriba del card, más grande y con peso visual.
- **Formulario**: Mismos campos; inputs un poco más altos (py-2.5), botón "Entrar" full-width y más prominente.
- **Abajo del card**: "¿Nueva empresa? Crear cuenta" y un link "Volver al inicio" que lleve a `/`.
- **Ventaja**: Rápido de implementar, mejora la percepción sin cambiar flujos.

### Opción B – Split screen

- **Layout**: Mitad izquierda: ilustración o gradiente de marca + frase (ej. "Tu stock y ventas en un solo lugar"). Mitad derecha: formulario de login en fondo claro.
- **Ventaja**: Aspecto más "producto SaaS". **Desventaja**: En móvil hay que colapsar a una sola columna (solo formulario o solo branding).

### Opción C – Card flotante con ilustración

- **Layout**: Fondo con imagen o ilustración abstracta (baja prominencia); card blanco centrado con el formulario y una pequeña ilustración o icono arriba del título.
- **Ventaja**: Más personalidad. **Desventaja**: Requiere asset (ilustración/imagen) y cuidado de contraste/legibilidad.

---

## Mejoras de copy y UX

| Elemento | Actual | Propuesta |
|----------|--------|-----------|
| Título | "Clothing Stock" | "GIRO" (si el app usa GIRO) o "Clothing Stock" con subtítulo "Iniciar sesión" |
| Subtítulo | "Ingresá con tu usuario…" | Mantener o acortar: "Ingresá a tu panel" |
| Botón | "Entrar" | "Entrar" o "Iniciar sesión" |
| Footer | Solo "Crear cuenta" | Añadir "Volver al inicio" (link a `/`) |
| Placeholders | Sin placeholder | Opcional: "Usuario" y "Contraseña" en placeholder para más claridad en móvil |

---

## Opcionales (futuro)

- **"¿Olvidaste tu contraseña?"**: Link que por ahora puede llevar a un modal o página que diga "Contactá a tu administrador" o "En desarrollo".
- **Modo oscuro en login**: Si se aplica tema oscuro a toda la app, el login podría leer `giro-theme` y aplicar clases `dark:` para consistencia.
- **Recordatorio post-login**: Si "Recordarme" está desmarcado, se usa `sessionStorage`; si está marcado, `localStorage` (ya implementado).

---

## Recomendación

**Implementar Opción A (centrado mejorado)** con:

1. Card con `rounded-xl`, `shadow-md`, `border border-slate-200`, padding generoso.
2. Título de marca más destacado; subtítulo "Iniciar sesión" o "Ingresá a tu panel".
3. Link "Volver al inicio" debajo de "Crear cuenta".
4. Misma paleta (indigo para botón, slate para texto) para consistencia con el panel.
5. (Opcional) Soporte dark mode en la página de login usando el mismo `ThemeContext` si el usuario ya tiene tema oscuro guardado.

Si estás de acuerdo con esta propuesta, el siguiente paso es aplicar la Opción A en `LoginPage.tsx`.
