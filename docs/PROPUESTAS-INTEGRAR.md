# Propuestas para integrar – Próximas mejoras

Ideas concretas para seguir mejorando GIRO, ordenadas por impacto y esfuerzo. Muchas se pueden sumar a [MEJORAS-FUTURAS.md](./MEJORAS-FUTURAS.md) como ítems nuevos.

---

## Plan paso a paso (orden sugerido)

Hacé **un paso a la vez**; cuando esté listo, pasá al siguiente.

| Paso | Qué hacer | Estado |
|------|------------|--------|
| **1** | Modo oscuro en páginas públicas: toggle sol/luna en Login, Registro y Landing; script en `index.html` para aplicar tema al cargar (evitar flash). | ✅ Hecho |
| **2** | Documentar variables de entorno: crear `.env.example` en backend y en frontend (sin valores sensibles). | ✅ Hecho |
| **3** | i18n en una pantalla piloto: traducir Plan (o Registro) con claves en `es.json`/`en.json` y `t()`. | ✅ Hecho |
| **4** | i18n en el resto: Inventario, Ventas, Traspasos, Reportes, Sucursales, Usuarios, Landing. | ✅ Hecho |
| **5** | Link “Olvidé contraseña” bien visible en Login y revisar flujo de `/forgot-password`. | ✅ Hecho |
| **6** | Recibo descargable después de una venta (PDF o HTML para imprimir). | ✅ Hecho |
| **7** | Filtros/búsqueda avanzada en Inventario (categoría, marca, stock bajo). | ✅ Hecho |
| **8** | Rate limiting en el backend (Express). | ✅ Hecho |
| **9** | Tests: al menos un test e2e (login → dashboard) o tests unitarios de un servicio. | ✅ Hecho |
| **10** | Integración real de pago (Stripe) cuando quieran monetizar. | ✅ Hecho |

Cuando termines un paso, actualizá la tabla (poné ✅ en Estado) y seguí con el siguiente.

---

## 1. Ya documentado y pendiente (MEJORAS-FUTURAS.md)

- ✅ **Notificaciones push** (navegador): hecho — Web Push con VAPID, suscripción en Settings.
- **App móvil nativa**: React Native o similar si el uso en celular crece mucho; hoy la PWA ya permite instalar.

---

## 2. Login y experiencia pública (PROPUESTA-LOGIN.md)

- **Login centrado mejorado (Opción A)**: Ya tenés GIRO, “Volver al inicio” y mensaje post-registro. Pendiente opcional:
  - **Modo oscuro en login/registro/landing**: que lean el tema guardado (`ThemeContext` o `localStorage`) y apliquen `dark:` para que sea consistente con el panel.
- **Landing/Login en más idiomas**: si ampliás i18n, traducir textos de la landing y del login (ya usás claves en login; falta traducir landing y registro).

---

## 3. Multi-idioma (i18n) en el resto de la app

Hoy están traducidos: menú, login y dashboard. El resto de pantallas tiene textos en español fijos.

- **Completar traducciones** para: Inventario, Ventas, Traspasos, Reportes, Sucursales, Usuarios, Plan, Registro, Landing.
- Añadir las claves en `es.json` y `en.json` y reemplazar strings por `t('clave')`.
- **Impacto**: mejor para clientes que prefieren inglés o para expandir a otros países.

---

## 4. Producto y operación día a día

| Propuesta | Descripción | Esfuerzo | Estado |
|-----------|-------------|----------|--------|
| **Importación masiva de productos** | Subir Excel/CSV con productos y variantes (nombre, SKU, talle, color, precio) y crear/actualizar en lote. | Medio | ✅ Hecho (`CsvImportModal`) |
| **Búsqueda y filtros avanzados** | En Inventario: por categoría, marca, rango de precio, “solo con stock bajo”. En Ventas: por método de pago, sucursal, rango de fechas. | Bajo–medio | ✅ Hecho |
| **Recordatorio “Olvidé contraseña” desde login** | Ya existe `/forgot-password`; asegurar que el link en login sea visible y que el flujo esté bien indicado. | Bajo | ✅ Hecho |
| **Resumen por email** | Email diario (20:00) y semanal (lunes 08:00) con ventas, via cron. | Medio | ✅ Hecho (`infrastructure/cron/jobs.ts` + `notifications.service.ts`) |
| **Comprobante/recibo descargable** | Después de una venta, botón “Descargar recibo” (PDF o HTML para imprimir) con ítems, total, fecha, sucursal. | Bajo–medio | ✅ Hecho |

---

## 5. Planes y facturación

- ✅ **Stripe + MercadoPago**: integrados en Fase 7 (`backend/src/application/billing/`), con límites por plan.
- **Facturación por uso**: si algún plan tiene límites (ej. sucursales), validar en backend y mostrar aviso en Plan cuando se acerquen al límite.
- **Portal del cliente**: enlace “Gestionar suscripción” que abra el Customer Portal de Stripe (cambiar plan, ver facturas, actualizar tarjeta).

---

## 6. Calidad, seguridad y despliegue

| Propuesta | Descripción | Esfuerzo | Estado |
|-----------|-------------|----------|--------|
| **Tests** | Tests unitarios (servicios del backend, utilidades del frontend) y un flujo e2e básico (login → dashboard o una venta). | Medio–alto | ✅ Hecho — backend 64/64, frontend 33/33 (2026-07-11) |
| **Variables de entorno documentadas** | `.env.example` en backend y frontend con todas las variables necesarias (sin valores sensibles), como en el checklist de MEJORAS-FUTURAS. | Bajo | ✅ Hecho |
| **Rate limiting** | En Express: limitar requests por IP o por usuario (ej. 100 req/15 min) para evitar abusos. | Bajo | ✅ Hecho |
| **Logs de auditoría** | Tabla “quién hizo qué y cuándo” (alta de usuario, cambio de rol, eliminación de producto, etc.) para empresas que lo pidan. | Medio | ✅ Hecho (`audit.router.ts`) |
| **Checklist pre-deploy** | Ir tildando en MEJORAS-FUTURAS el checklist “antes de subir” (repo, CORS, `VITE_API_URL`, etc.) cuando lo vayan cumpliendo. | Bajo | En progreso — ver [MEJORAS-FUTURAS.md](./MEJORAS-FUTURAS.md#checklist-antes-de-subir) |

---

## 7. UX y accesibilidad

- **Atajos de teclado documentados**: en el POS ya hay Enter/Escape; agregar en el menú o en un modal “?” la lista de atajos (o un pequeño hint en el header).
- **Focus y contraste**: revisar que todos los botones y enlaces tengan focus visible y que los textos cumplan contraste mínimo (herramientas como axe o Lighthouse).
- **Mensajes de error más claros**: que los toasts o mensajes del backend (ej. “Usuario ya existe”, “Stock insuficiente”) sean claros y, si aplica, indiquen qué hacer.

---

## 8. Ideas a largo plazo

- **API pública o webhooks**: para que otros sistemas (ecommerce, contabilidad) lean ventas o stock, o reciban eventos (venta registrada, stock bajo).
- **Dashboard personalizable**: que el usuario elija qué widgets ver (ventas hoy, gráfico 7 días, alertas, etc.) y en qué orden.
- **Modo offline más robusto**: que la PWA guarde ventas o ajustes en cola cuando no hay red y los envíe al reconectar.
- **Integración con impresora térmica**: para tickets de venta en locales (requiere driver o servicio en el dispositivo).

---

## Cómo usar este documento

1. **Elegir 1–2 ítems** por iteración (ej. “i18n en Inventario y Ventas” + “Modo oscuro en login”).
2. **Marcar en MEJORAS-FUTURAS** los que quieran trackear ahí, como ítems `[ ]` con una línea de descripción.
3. **Priorizar** según si el objetivo es: mostrar a más clientes (i18n, login/landing), vender (Stripe, planes), o consolidar (tests, seguridad, checklist deploy).

Si querés, el siguiente paso puede ser: **añadir estas secciones como ítems concretos en MEJORAS-FUTURAS.md** (por ejemplo una nueva subsección “Propuestas adicionales”) para tener todo en un solo lugar.
