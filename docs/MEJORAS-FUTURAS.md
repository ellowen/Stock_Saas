# Mejoras futuras y despliegue en la nube

Este documento reúne **mejoras futuras** del producto y opciones para **subir la aplicación a la nube** con costos bajos o gratuitos.

> **Recomendación resumida (económico, bueno, seguro):** ver **[HOSTING-RECOMENDACIONES.md](./HOSTING-RECOMENDACIONES.md)** — Railway para mejor relación precio/calidad, o Render + Vercel para arrancar gratis.

---

## Mejoras futuras (producto)

Ideas para seguir mejorando GIRO más adelante:

- **POS / Ventas**
  - [x] Mostrar en el mensaje de éxito el vuelto a entregar (ej. “Entregar $X de vuelto”) para que quede anotado.
  - [x] Botones rápidos de monto recibido: +200, +500.
  - [x] Sonido o notificación clara al confirmar la venta (beep de éxito con Web Audio API).
  - [x] Opción de “recibo” en pantalla (total, pagado, vuelto) que quede visible unos segundos después de cobrar.
  - *Las anteriores ya implementadas en Ventas (SalesPage).*

- **Inventario**
  - [x] Alertas de stock bajo (aviso cuando la cantidad baje de un mínimo configurable). *Mínimo por ítem en Inventario (modal Editar); si no se define, alerta cuando &lt; 5. Badge "Bajo mínimo" en tabla y contador en Dashboard.*
  - [x] Código de barras en etiquetas o en pantalla para imprimir. *Inventario → Stock → "Imprimir etiquetas": vista previa con código de barras (CODE128) por ítem y botón Imprimir.*
  - [x] Historial de movimientos por producto o por sucursal (quién modificó, cuándo). *Tab "Historial de movimientos" en Inventario: filtros sucursal y fechas; tabla con fecha, sucursal, producto/variante, tipo (Venta, Ajuste, Edición, Traspaso), antes/después, usuario.*

- **Reportes**
  - [x] Gráficos exportables a imagen o PDF. *Cada gráfico tiene "Descargar PNG"; botón "Exportar gráficos a PDF" genera un PDF con todos los gráficos del reporte (html2canvas + jsPDF).*
  - [x] Comparativa de períodos (este mes vs mes anterior). *Sección "Comparativa con período anterior" en Reportes: período seleccionado vs mismo número de días anteriores; tabla lado a lado + gráfico de barras Actual vs Anterior.*
  - [x] Reporte de productos sin movimiento en X días. *En Reportes, sección "Productos sin movimiento": indicás cantidad de días y sucursal opcional; lista ítems en inventario sin movimientos (venta, ajuste, traspaso) en ese período; exportable a CSV.*

- **Usuarios y permisos**
  - [x] Permisos más granulares (ej. solo ventas en una sucursal, sin ver reportes). *SELLER solo ve Dashboard, Inventario, Ventas y Plan; Reportes y Traspasos solo OWNER/MANAGER; Sucursales y Usuarios solo OWNER/MANAGER. Backend protege rutas de analytics (reportes) y stock-transfers con requireRole.*
  - [x] Recuperación de contraseña por email (olvidé mi contraseña). *Por compañía y email: en /forgot-password se indica nombre de la empresa + email de la cuenta; el enlace se envía solo a ese correo (usuario de esa empresa). /reset-password?token=… para nueva contraseña. SMTP opcional; en dev el link se imprime en consola.*

- **General**
  - [x] PWA (instalable en el celular como app). *vite-plugin-pwa con manifest (nombre GIRO, theme-color); instalable desde el navegador en móvil/desktop.*
  - [x] Notificaciones in-app para stock bajo. *Al entrar al Dashboard, si hay ítems bajo mínimo: toast informativo + banner con enlace a Inventario (una vez por sesión).*
  - [ ] Notificaciones push (navegador, opcional) para alertas de stock o resúmenes cuando la app está cerrada.
  - [x] Multi-idioma (es/en). *Base: i18next + react-i18next; selector ES/EN en header (app) y en login; traducciones en menú, login y dashboard; idioma guardado en localStorage. Resto de pantallas se puede ir traduciendo con las mismas claves.*
  - [ ] App móvil nativa (React Native o similar) si hace falta uso intensivo en celular.
  - [x] Atajos de teclado en POS. *Enter en el modal de cobro confirma la venta; Escape cierra el modal o las sugerencias de búsqueda. Hint en el modal: "Enter confirmar · Escape cancelar".*
  - [x] Exportar datos de la empresa (backup productos, inventario, ventas). *En Plan: sección "Exportar datos de la empresa"; descarga un Excel con hojas Productos, Inventario (por sucursal), Ventas (último año, hasta 100).*

- **Landing, alta y planes**
  - [x] Landing mejorada. *Hero claro, sección "Qué es GIRO" (inventario, POS, sucursales, reportes, permisos), beneficios, CTA "3 meses gratis. Sin tarjeta." Ver [LANDING-PLANES-Y-PAGO.md](./LANDING-PLANES-Y-PAGO.md).*
  - [x] Registro por pasos. *Alta en 2–3 pasos: (1) Empresa, (2) Cuenta administrador, (3) Confirmación con resumen y "3 meses gratis".*
  - [x] Prueba gratuita de 3 meses. *Backend: trialEndsAt = hoy + 90 días en register. Frontend: reemplazar "14 días" por "3 meses" en landing, registro, sidebar y Plan.*
  - [x] Planes visibles y post-trial. *En Plan: sección "Planes disponibles" (Free, Pro, Enterprise) con descripción y precio/placeholder. Aviso cuando el trial terminó o está por vencer: "Elegí un plan para seguir".*
  - [x] Método de pago preparado (sin funcionar). *Botón "Elegir plan" / "Suscribirme" en Pro/Enterprise; modal o pantalla "Método de pago" con texto "Próximamente" o formulario mock; sin integración real (Stripe, etc.). Opcional: endpoint placeholder que responda "Próximamente".*
  - *Especificación completa y prompt listo para implementar: **[LANDING-PLANES-Y-PAGO.md](./LANDING-PLANES-Y-PAGO.md)**.*

- **Más propuestas (lista extendida)**  
  - Ideas adicionales de mejora (i18n en más pantallas, importación masiva, Stripe real, tests, seguridad, accesibilidad, etc.) están en **[PROPUESTAS-INTEGRAR.md](./PROPUESTAS-INTEGRAR.md)**. Podés elegir de ahí los próximos ítems a implementar.

---

## Dónde subir la aplicación (hosting en la nube)

GIRO tiene **frontend** (React/Vite), **backend** (Node/Express) y **base de datos** (MySQL con Prisma). Abajo hay opciones para desplegar todo con **coste bajo o gratuito**.

### Resumen rápido

| Parte     | Opciones gratuitas / económicas        |
|-----------|----------------------------------------|
| Frontend  | Vercel, Netlify, Cloudflare Pages      |
| Backend   | Render, Railway, Fly.io                |
| Base de datos (MySQL) | PlanetScale, Railway, Render (MySQL add-on) o migrar a PostgreSQL (Supabase, Neon, Render) |

---

### 1. Frontend (la app que ve el usuario)

- **Vercel**  
  - Plan gratuito generoso. Conectás el repo de GitHub y cada push despliega.  
  - URL tipo: `tu-app.vercel.app`. Dominio propio opcional.  
  - https://vercel.com  

- **Netlify**  
  - También gratis para proyectos personales. Build desde Git, deploys automáticos.  
  - https://netlify.com  

- **Cloudflare Pages**  
  - Plan gratuito sin límite de ancho de banda. Muy estable para sitios estáticos/SPA.  
  - https://pages.cloudflare.com  

**Recomendación:** Vercel o Netlify son los más sencillos para un frontend React/Vite: conectar repo, comando de build `npm run build`, carpeta `dist` y listo.

---

### 2. Backend (API Node/Express)

- **Render**  
  - Plan **free**: un servicio se “duerme” tras inactividad y tarda unos segundos en despertar. Ideal para demos o bajo tráfico.  
  - Podés crear también una base PostgreSQL gratis en Render y, si más adelante migrás de MySQL a PostgreSQL, tendrías todo en un solo lugar.  
  - https://render.com  

- **Railway**  
  - Ofrece créditos gratis al mes; cuando se acaban, es de pago. Muy fácil para subir un backend + base de datos.  
  - https://railway.app  

- **Fly.io**  
  - Tiene tier gratuito por región. Requiere un poco más de configuración (Docker/cli) pero es muy flexible.  
  - https://fly.io  

**Recomendación:** Empezar con **Render (free)** para el backend: creás un “Web Service”, conectás el repo del backend, configurás el comando de start y las variables de entorno (incluida la URL de la base de datos).

---

### 3. Base de datos (MySQL hoy)

Hoy el proyecto usa **MySQL** (Prisma). Opciones:

- **PlanetScale**  
  - Ofrece MySQL en la nube con plan gratuito (límites de uso). Buena opción para seguir con MySQL sin tocar el código.  
  - https://planetscale.com  

- **Railway**  
  - Podés crear un servicio MySQL en el mismo proyecto que el backend. Consumís parte del crédito gratis.  

- **Migrar a PostgreSQL**  
  - Si aceptás cambiar de MySQL a PostgreSQL (Prisma lo soporta; hay que ajustar tipos y alguna query puntual):  
    - **Supabase**: PostgreSQL gratis, cómodo para empezar.  
    - **Neon**: PostgreSQL serverless, tier gratuito.  
    - **Render**: base PostgreSQL gratis en la misma cuenta donde podés tener el backend.  

**Recomendación:**  
- Si querés **no tocar nada** de base de datos: **PlanetScale** (MySQL gratis).  
- Si te parece bien **migrar a PostgreSQL** a medio plazo: **Supabase** o **Render (PostgreSQL)** para tener backend + DB en un solo proveedor y seguir en plan gratuito.

---

### 4. Escenario típico “todo gratis”

1. **Frontend** en **Vercel** (repo del frontend, build con `npm run build`, raíz `dist`).  
2. **Backend** en **Render** (Web Service, repo del backend, `npm install && npm run build && npm start`, variables de entorno).  
3. **Base de datos**:  
   - Opción A: **PlanetScale** (MySQL) y en Render ponés `DATABASE_URL` de PlanetScale.  
   - Opción B: **PostgreSQL en Render** (base gratuita) y migrás el proyecto de MySQL a PostgreSQL (cambiar provider en Prisma + pequeños ajustes).  

En el frontend, la variable de entorno `VITE_API_URL` (o la que uses) debe apuntar a la URL del backend en Render (ej. `https://tu-backend.onrender.com`).

---

### 5. Costos a tener en cuenta

- **Vercel / Netlify / Cloudflare Pages (frontend):** gratis para uso normal.  
- **Render free:** el backend se duerme; el primer request después de un rato puede tardar ~30–50 s. Para producción seria podrías pasar al plan de pago (unos pocos USD/mes).  
- **Railway:** créditos gratis limitados; después es por uso.  
- **PlanetScale / Supabase / Neon:** planes gratuitos con límites; suelen bastar para una sola empresa o pocos clientes.  

Si más adelante querés **sin “sueño”** del backend y más recursos, un plan de pago en Render o Railway suele estar en el orden de **5–15 USD/mes** según uso.

---

## Checklist antes de subir

- [ ] Repo en GitHub (o GitLab) con frontend y backend en carpetas o repos separados.
- [ ] Variables de entorno documentadas (`.env.example` sin valores sensibles).
- [ ] En producción, `DATABASE_URL` y `JWT_SECRET` (o equivalentes) seguros y distintos a los de desarrollo.
- [ ] CORS del backend permitiendo el origen del frontend (URL de Vercel/Netlify).
- [ ] Build del frontend usando la URL del API de producción (`VITE_API_URL` o similar).

---

*Documento vivo: conviene ir actualizando este archivo cuando se implementen mejoras o se elija un proveedor concreto de hosting.*
