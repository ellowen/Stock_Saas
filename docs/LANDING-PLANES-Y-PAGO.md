# Landing, planes y método de pago — Especificación

Este documento describe las mejoras deseadas para: **landing page**, **flujo de alta**, **prueba gratuita de 3 meses**, **planes de pago** y **integración de cobro (preparada pero sin funcionar)**.

---

## 1. Objetivo general

- **Landing:** Explicar mejor qué es GIRO y para quién es; reforzar propuesta de valor.
- **Alta:** Mejorar los pasos para dar de alta (registro más claro y guiado).
- **Prueba:** Pasar de 14 días a **3 meses gratis**; después de eso, el usuario ve planes y puede elegir uno.
- **Planes y pago:** Mostrar planes (Free / Pro / Enterprise) y **dejar preparada** la UI y el flujo para método de pago (tarjeta, etc.), pero **sin conectar** a ningún proveedor real (Stripe, Mercado Pago, etc.). Es decir: pantallas, textos y estructura listas; la acción de “pagar” o “elegir plan de pago” no ejecuta cobro real.

---

## 2. Landing page

### Contenido a mejorar

- **Hero:** Título y subtítulo que comuniquen claramente: “GIRO es un sistema para gestionar stock, ventas y sucursales de tu negocio (tiendas, locales, emprendimientos)”.
- **Sección “De qué trata GIRO” (o “Qué es GIRO”):**
  - Inventario por sucursal, alertas de stock bajo.
  - Punto de venta (POS) ágil.
  - Múltiples sucursales y traspasos.
  - Reportes y gráficos.
  - Usuarios y permisos (dueño, encargado, vendedor).
  - Opcional: “Instalable en el celular” (PWA), “Backup de tus datos”.
- **Beneficios o “Por qué GIRO”:** Simple, en español, sin complicaciones; pensado para PyMEs y emprendimientos.
- **Prueba y CTA:** Dejar claro: “3 meses gratis. Sin tarjeta para empezar.” Botones: “Crear cuenta gratis” y “Ya tengo cuenta”.
- **Footer:** Mantener o ampliar con enlaces (Login, Registro, contacto si aplica).

### Ideas adicionales

- Pequeñas “cards” o íconos con cada módulo (Inventario, Ventas, Reportes, Sucursales).
- Una línea tipo: “Empezá en minutos: creá tu empresa, cargá productos y vendé.”

---

## 3. Pasos para dar de alta (registro)

### Flujo actual

- Una sola pantalla: empresa, nombre completo, usuario, contraseña, email.
- Al enviar, se crea empresa + usuario y se redirige a login.

### Mejoras deseadas

- **Paso 1 – Tu empresa:** Nombre de la empresa (y opcional: tipo de negocio o rubro).
- **Paso 2 – Tu cuenta:** Nombre completo, usuario, contraseña, email. Texto tipo: “Este usuario será el administrador de la empresa.”
- **Paso 3 – Confirmación:** Resumen: “Vas a crear [Empresa] y tu usuario [nombre]. Tendrás 3 meses gratis.” Botón “Crear cuenta”.
- Opcional: un indicador de pasos (1, 2, 3) para que se vea guiado.
- Mensaje post-registro: “Listo. Tenés 3 meses de prueba gratis. Entrá a tu panel.”

No hace falta cambiar el backend del registro en esta fase; solo mejorar la UI en pasos y textos (y que el backend siga creando empresa + usuario en un solo request si se desea).

---

## 4. Prueba gratuita: 3 meses

### Cambios

- **Backend:** En el registro, en lugar de `trialEndsAt = hoy + 14 días`, usar `trialEndsAt = hoy + 3 meses` (90 días o 92 para simplificar).
- **Frontend (landing, registro, panel):** Reemplazar cualquier mención de “14 días” por “3 meses” (ej. “3 meses de prueba gratis”, “Prueba hasta [fecha]” en el sidebar).
- **Plan / Dashboard:** Donde se muestre la trial, indicar claramente: “Prueba gratuita hasta [fecha]” (3 meses desde el alta).

---

## 5. Planes de pago (preparados, sin cobro real)

### Planes a mostrar

- **Gratis (Free):** Límites por definir (ej. 1 sucursal, X productos). “Siempre gratis” o “Para probar sin tiempo límite” según se decida.
- **Pro:** Para crecer (más sucursales, más funciones). Precio mensual sugerido (ej. “$X/mes”); se puede dejar como “Próximamente” o “Consultar”.
- **Enterprise:** Para equipos más grandes. “A medida” o “Consultar”.

Los precios y límites pueden ser placeholders; lo importante es que la **estructura** (nombres, descripciones, posible precio) esté clara en la UI.

### Dónde mostrarlos

- **Página Plan (dentro del app):** Sección “Tu plan actual” (ya existe) y una sección “Planes disponibles” o “Elegí tu plan” con las 3 opciones en cards o tabla.
- **Post-trial:** Cuando `trialEndsAt` ya pasó (o está por vencer), mostrar un aviso: “Tu prueba terminó. Elegí un plan para seguir usando GIRO” y enlace/botón a la misma página de planes.

---

## 6. Método de pago (solo preparado, sin funcionar)

### Objetivo

Tener la **interfaz y el flujo** listos para que más adelante se conecte un proveedor (Stripe, Mercado Pago, etc.), pero **sin** procesar pagos reales.

### Qué incluir

- En la página **Plan**, para los planes de pago (Pro / Enterprise): botón tipo “Elegir plan” o “Suscribirme”.
- Al hacer clic, se puede mostrar:
  - Un **modal o pantalla** “Método de pago” con:
    - Texto: “Próximamente podrás agregar tu tarjeta y suscribirte desde acá.”
    - O: formulario **mock** (campos de tarjeta, nombre, vencimiento, etc.) deshabilitados o solo visual, con leyenda: “Pago seguro — En construcción” o “La pasarela de pago estará disponible pronto.”
  - No llamar a ninguna API de pago real; no guardar datos de tarjeta.
- Opcional: en el backend, dejar **preparado** un endpoint tipo `POST /plan/choose` o `POST /subscription` que reciba `planId` y responda 200 con un mensaje tipo “Subscription flow not implemented yet”, para que el frontend pueda llamarlo y mostrar un toast “Próximamente” sin romper.

### Resumen

- UI de “elegir plan” y “método de pago” **visible y clara**.
- **Cero** integración real con pasarela; todo “en construcción” o “próximamente”.

---

## 7. Resumen de tareas técnicas

| Área            | Tarea                                                                 | Estado deseado        |
|-----------------|-----------------------------------------------------------------------|------------------------|
| Landing         | Mejorar hero, agregar sección “Qué es GIRO”, beneficios, CTA          | Implementado           |
| Landing         | Texto “3 meses gratis. Sin tarjeta.”                                 | Implementado           |
| Registro        | Dividir en 2–3 pasos (empresa → cuenta → confirmación)               | Implementado           |
| Registro        | Mensaje “3 meses de prueba” en resumen y post-alta                     | Implementado           |
| Backend         | trialEndsAt = hoy + 3 meses (90 días) en register                     | Implementado           |
| Frontend (app)  | Reemplazar “14 días” por “3 meses” en sidebar y Plan                  | Implementado           |
| Plan (página)   | Sección “Planes disponibles” (Free, Pro, Enterprise)                  | Implementado           |
| Plan (página)   | Aviso cuando trial terminó o por vencer                               | Implementado           |
| Método de pago  | Botón “Elegir plan” / “Suscribirme” + modal o pantalla mock            | Solo UI, sin cobro real |
| Backend (opcional) | Endpoint placeholder para “elegir plan” (respuesta “próximamente”)  | Opcional               |

---

## 8. Ideas adicionales (opcionales)

- **Landing:** Testimonial o frase de ejemplo: “Controlá stock y ventas desde un solo lugar.”
- **Registro:** Validación de contraseña (mínimo 6 caracteres, ya existe) y opcional: “Acepto términos y condiciones” con link a página estática o #.
- **Plan:** Comparativa en tabla (Free vs Pro vs Enterprise) con ticks y límites.
- **Post-trial:** Email recordatorio “Tu prueba termina en X días” (cuando exista envío de emails).
- **i18n:** Añadir claves para todos los textos nuevos (landing, registro por pasos, planes) en `es.json` / `en.json`.

---

## 9. Prompt para implementación

Copiá y pegá el siguiente bloque (o adaptalo) para que un desarrollador o una sesión de Cursor implemente todo lo anterior:

```
Contexto: GIRO es una app de gestión de stock y ventas (inventario, POS, sucursales, reportes). Stack: frontend React/Vite, backend Node/Express, Prisma/MySQL.

Objetivo: Mejorar landing, flujo de alta, trial y planes; dejar preparado (sin funcionar) el método de pago.

Tareas:

1) LANDING (LandingPage.tsx)
- Mejorar el hero: título y subtítulo que expliquen claramente que GIRO sirve para gestionar stock, ventas y sucursales (tiendas, locales, emprendimientos).
- Agregar una sección "Qué es GIRO" o "De qué se trata": inventario por sucursal, POS, múltiples sucursales y traspasos, reportes, usuarios y permisos; opcional: PWA, backup de datos.
- Agregar una sección breve de beneficios ("Simple, en español, para PyMEs").
- CTA: "3 meses gratis. Sin tarjeta para empezar." Botones: Crear cuenta gratis / Ya tengo cuenta.
- Footer con enlace a login y registro. Opcional: cards o íconos por módulo (Inventario, Ventas, Reportes).

2) REGISTRO (RegisterPage.tsx)
- Dividir en 2 o 3 pasos: (1) Tu empresa: nombre de empresa; (2) Tu cuenta: nombre completo, usuario, contraseña, email, texto "Este usuario será el administrador"; (3) Confirmación: resumen "Vas a crear [Empresa], usuario [X]. Tendrás 3 meses gratis" y botón "Crear cuenta".
- Indicador de pasos (1, 2, 3). Al enviar el último paso, llamar al mismo endpoint POST /auth/register con todos los datos y redirigir a login.
- Mensaje post-registro o en login: "Tenés 3 meses de prueba gratis."

3) TRIAL 3 MESES
- Backend (auth.service.ts): en register, cambiar trialEndsAt de "hoy + 14 días" a "hoy + 90 días" (3 meses).
- Frontend: en LandingPage, RegisterPage, AppLayout (sidebar) y PlanPage, reemplazar cualquier "14 días" por "3 meses" y mostrar "Prueba hasta [fecha]" con trialEndsAt.

4) PLANES (PlanPage.tsx)
- Mantener sección "Tu plan actual" y "Exportar datos".
- Agregar sección "Planes disponibles": Free, Pro, Enterprise en cards o tabla (nombre, descripción, precio placeholder o "Consultar"). Free puede ser "Siempre gratis" o con límites; Pro/Enterprise con texto "Próximamente" o precio ejemplo.
- Si trialEndsAt ya pasó (o está por vencer, ej. &lt; 7 días), mostrar aviso: "Tu prueba terminó (o está por terminar). Elegí un plan para seguir usando GIRO" con enlace a la misma sección de planes.

5) MÉTODO DE PAGO (solo preparado, sin cobro real)
- En la sección de planes, para Pro y Enterprise: botón "Elegir plan" o "Suscribirme".
- Al hacer clic: modal o pantalla "Método de pago" con texto "Próximamente podrás agregar tu tarjeta y suscribirte desde acá" o un formulario mock (campos tarjeta deshabilitados / solo visual) con leyenda "Pago seguro — En construcción". No integrar con Stripe ni ningún proveedor; no guardar datos de tarjeta.
- Opcional: endpoint POST /plan/choose o /subscription que reciba planId y responda 200 con mensaje "Próximamente", para que el frontend muestre un toast y cierre el modal.

6) DOCS
- Actualizar MEJORAS-FUTURAS.md con ítems: Landing mejorada, Registro por pasos, Trial 3 meses, Planes visibles, Método de pago (preparado).
- Mantener o ampliar LANDING-PLANES-Y-PAGO.md con lo implementado.

Implementar en ese orden. Dejar el código listo para que más adelante se pueda conectar una pasarela de pago real sin cambiar la estructura de la UI.
```

---

## 10. Referencias en el repo

- **Landing:** `frontend/src/pages/LandingPage.tsx`
- **Registro:** `frontend/src/pages/RegisterPage.tsx`
- **Plan:** `frontend/src/pages/PlanPage.tsx`
- **Trial en backend:** `backend/src/application/auth/auth.service.ts` (register, `trialEndsAt`)
- **Trial en UI:** `frontend/src/layout/AppLayout.tsx` (sidebar “Prueba hasta…”), `PlanPage.tsx`
- **Mejoras futuras:** `docs/MEJORAS-FUTURAS.md`
