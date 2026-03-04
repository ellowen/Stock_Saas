# Cómo generar el manual de usuario en PDF

Este documento explica cómo obtener el **PDF del manual** para entregarlo a clientes, y cómo **agregar capturas de pantalla** para que el manual sea más claro.

---

## Opción 1: PDF sin imágenes (rápido)

1. Abrí el archivo **`manual-usuario.html`** en tu navegador (doble clic o arrastrándolo a Chrome/Edge/Firefox).
2. Menú **Archivo → Imprimir** (o `Ctrl+P` / `Cmd+P`).
3. En **Destino** elegí **Guardar como PDF** (o “Microsoft Print to PDF” en Windows).
4. Clic en **Guardar** y elegí la carpeta y nombre (por ejemplo: `Manual-GIRO-Usuario.pdf`).

El PDF se generará con el texto completo. Donde corresponderían las imágenes verás un recuadro con el texto “Figura X: …”. Esas partes se pueden reemplazar después agregando las capturas (ver Opción 2).

---

## Opción 2: PDF con imágenes (capturas de pantalla)

Para que el manual muestre capturas reales de la aplicación:

### Paso 1: Crear la carpeta de imágenes

En la carpeta **`docs`** (donde está `manual-usuario.html`), creá una carpeta llamada:

```text
manual-images
```

Quedaría: `docs/manual-images/`

### Paso 2: Tomar las capturas

Abrí la aplicación GIRO en el navegador y tomá capturas de las siguientes pantallas. Guardalas en `docs/manual-images/` con **exactamente** estos nombres:

| Archivo             | Contenido sugerido                                      |
|---------------------|---------------------------------------------------------|
| `01-landing.png`    | Página de inicio (landing) con logo GIRO y botones      |
| `02-registro.png`   | Formulario “Crear cuenta”                               |
| `03-login.png`      | Pantalla de inicio de sesión                           |
| `04-panel.png`      | Panel principal con menú lateral (p. ej. Inicio)       |
| `05-dashboard.png`  | Dashboard con tarjetas y gráficos                      |
| `06-inventario.png` | Inventario (pestaña Productos o Stock)                 |
| `07-ventas.png`     | Punto de venta con carrito o Historial de ventas       |
| `08-traspasos.png`  | Lista de traspasos o formulario nuevo traspaso         |
| `09-reportes.png`   | Reporte con rango de fechas, gráficos o tablas         |
| `10-sucursales.png` | Tabla de sucursales (o modal nueva sucursal)           |
| `11-usuarios.png`   | Tabla de usuarios (o modal nuevo usuario)               |
| `12-plan.png`       | Página Plan                                            |

Formato: **PNG** o **JPG**. Si usás JPG, cambiá la extensión en la tabla (ej. `01-landing.jpg`) y en el archivo `manual-usuario.html` tendrías que reemplazar `.png` por `.jpg` en la ruta de esa imagen (opcional; el HTML ya está preparado para `.png`).

### Paso 3: Generar el PDF de nuevo

1. Abrí de nuevo **`manual-usuario.html`** en el navegador (desde la carpeta `docs` o con la ruta correcta para que se carguen las imágenes).
2. Verificá que cada figura muestre la imagen y no el recuadro de “Agregar captura…”.
3. **Archivo → Imprimir → Guardar como PDF** y guardá el archivo.

El PDF resultante incluirá las capturas en cada sección.

---

## Archivos del manual

| Archivo                     | Uso                                                                 |
|----------------------------|---------------------------------------------------------------------|
| `MANUAL-USUARIO.md`        | Fuente del manual en Markdown; podés editarlo y convertir a PDF con otras herramientas (p. ej. Pandoc, VS Code). |
| `manual-usuario.html`      | Versión para imprimir/PDF; incluye lugar para imágenes.           |
| `manual-images/`           | Carpeta donde se guardan las capturas (01-landing.png, etc.).       |
| `INSTRUCCIONES-MANUAL-PDF.md` | Este archivo (instrucciones para generar el PDF y agregar imágenes). |

---

## Consejos para las capturas

- Resolución: 1200–1600 px de ancho suele verse bien en el PDF.
- Recortá la ventana del navegador para que no se vean pestañas ni barras innecesarias, o dejá la ventana completa si preferís.
- Si la app tiene modo claro y oscuro, elegí uno (por ejemplo modo claro) para que todas las capturas sean coherentes.

Si necesitás cambiar el texto del manual, editá `MANUAL-USUARIO.md` o `manual-usuario.html` según prefieras (Markdown es más fácil para texto; HTML para ajustar títulos o estilos de impresión).
