# Manual de usuario — GIRO

**Gestión de stock y ventas para tu negocio**

Versión 1.0

---

## Índice

1. [Introducción](#1-introducción)
2. [Acceso al sistema](#2-acceso-al-sistema)
3. [Crear cuenta](#3-crear-cuenta)
4. [Iniciar sesión](#4-iniciar-sesión)
5. [El panel principal](#5-el-panel-principal)
6. [Inicio (Dashboard)](#6-inicio-dashboard)
7. [Inventario](#7-inventario)
8. [Ventas](#8-ventas)
9. [Traspasos](#9-traspasos)
10. [Reportes](#10-reportes)
11. [Sucursales](#11-sucursales)
12. [Usuarios](#12-usuarios)
13. [Plan](#13-plan)
14. [Cerrar sesión y otros consejos](#14-cerrar-sesión-y-otros-consejos)

---

## 1. Introducción

**GIRO** es una aplicación web para gestionar el inventario y las ventas de tu negocio. Permite:

- **Varios locales (sucursales)** con stock independiente.
- **Productos con variantes** (talle, color, SKU, precio).
- **Punto de venta** rápido: buscar producto, agregar al carrito y cobrar (efectivo, tarjeta, mixto).
- **Traspasos** de stock entre sucursales.
- **Reportes** por período: ingresos, ventas por día, por categoría, método de pago y productos más vendidos.
- **Usuarios y roles**: Dueño, Encargado y Vendedor, con permisos distintos.
- **Exportar** inventario y reportes a CSV, Excel o PDF.

Podés usar GIRO desde cualquier navegador actualizado (Chrome, Firefox, Edge, Safari) en computadora o tablet.

---

## 2. Acceso al sistema

- Abrí la dirección web que te haya proporcionado tu proveedor (por ejemplo: `https://tu-app.ejemplo.com`).
- En la **página de inicio** verás la presentación de GIRO y los botones **Entrar** e **Iniciar cuenta gratis**.

> **Imagen sugerida:** captura de la página de inicio (landing) con el logo GIRO y los botones.

---

## 3. Crear cuenta

Si aún no tenés cuenta:

1. En la página de inicio, hacé clic en **Crear cuenta gratis** (o **Iniciar cuenta gratis**).
2. Completá el formulario:
   - **Nombre de la empresa** (obligatorio).
   - **Tu nombre completo** (obligatorio).
   - **Usuario** para iniciar sesión (obligatorio). Ej.: `jperez`.
   - **Contraseña** (mínimo 6 caracteres).
   - **Email** (opcional).
3. Hacé clic en **Crear cuenta**.
4. Serás redirigido al **inicio de sesión**. Podés iniciar sesión con el usuario y contraseña que acabás de crear.

La cuenta suele incluir un período de prueba (por ejemplo, 14 días). Los detalles aparecen en la sección **Plan** una vez dentro del panel.

> **Imagen sugerida:** formulario de registro (Crear cuenta) con los campos completados.

---

## 4. Iniciar sesión

1. En la página de inicio, hacé clic en **Entrar**.
2. Ingresá tu **usuario** y **contraseña**.
3. Opcional: marcá **Recordarme en este equipo** para mantener la sesión.
4. Hacé clic en **Entrar**.
5. Entrarás al **panel principal** (Inicio / Dashboard).

Si olvidaste tu contraseña, contactá al administrador de tu empresa o al soporte.

> **Imagen sugerida:** pantalla de inicio de sesión con usuario y contraseña.

---

## 5. El panel principal

Después de iniciar sesión verás:

- **Barra lateral (sidebar) a la izquierda** con el logo GIRO y el menú:
  - Inicio  
  - Inventario  
  - Ventas  
  - Traspasos  
  - Reportes  
  - Sucursales (si tenés permiso)  
  - Usuarios (si tenés permiso)  
  - Plan  

- **Cabecera superior** con el título de la página actual y un botón para cambiar entre **tema claro y oscuro** (sol/luna).

- **Área central** donde se muestra el contenido de cada sección.

En pantallas chicas (móvil/tablet) el menú se abre con el ícono de hamburguesa (☰) en la cabecera.

> **Imagen sugerida:** vista del panel con el menú lateral y la página de Inicio.

---

## 6. Inicio (Dashboard)

En **Inicio** se muestra un resumen de tu negocio:

- **Tarjetas de resumen**: ingresos del período, cantidad de ventas, etc.
- **Gráficos** (últimos 7 días):
  - Ingresos por día.
  - Cantidad de operaciones (ventas) por día.

Podés usar el botón **Actualizar** para recargar los datos. Si hay error, aparece la opción **Reintentar**.

> **Imagen sugerida:** Dashboard con las tarjetas y los dos gráficos.

---

## 7. Inventario

El inventario se organiza en **dos pestañas**: **Productos** y **Stock por sucursal**.

### 7.1 Productos

- **Listado** de todos los productos con nombre, categoría, marca y variantes (SKU, talle, color, etc.).
- **Filtros**: podés buscar por nombre o SKU y filtrar por categoría. Usá **Filtrar** o la tecla Enter para aplicar.
- **Nuevo producto**: botón **Nuevo producto**. Completá nombre, categoría, marca y las variantes (talle, color, SKU, código de barras, precio, costo). Cada variante puede tener su propio precio y stock se gestiona por sucursal en la pestaña Stock.
- **Exportar**: podés descargar el listado en **CSV**, **Excel (.xlsx)** o **PDF**.

### 7.2 Stock por sucursal

- **Listado** de stock por sucursal: producto/variante, SKU y cantidad.
- **Filtros**: por sucursal, por nombre o SKU del producto. **Filtrar** o Enter para aplicar.
- **Editar cantidad**: en cada fila hay un botón **Editar** para cambiar la cantidad en stock de esa variante en esa sucursal.
- **Exportar**: CSV, Excel o PDF del stock actual.

> **Imágenes sugeridas:** pestaña Productos con tabla y filtros; pestaña Stock con tabla y botón Editar; modal de nuevo producto.

---

## 8. Ventas

Hay **dos pestañas**: **Punto de venta** e **Historial**.

### 8.1 Punto de venta

1. **Elegir sucursal**: seleccioná la sucursal donde se realiza la venta. Todas las búsquedas y el stock se toman de esa sucursal.
2. **Buscar producto**: en el campo de búsqueda escribí nombre, SKU o código de barras. Podés usar un escáner y apretar Enter. Aparecerán sugerencias; hacé clic en el producto para agregarlo al carrito (o Enter sobre la opción).
3. **Carrito**: se listan los ítems agregados. Podés cambiar cantidad o quitar ítems. Se muestra el total.
4. **Cobrar**: al hacer clic en **Cobrar** elegís el **método de pago**:
   - Efectivo  
   - Tarjeta  
   - Mixto (indicá monto en efectivo y en tarjeta)  
   - Otro  
5. Confirmá y la venta queda registrada. El carrito se vacía.

### 8.2 Historial de ventas

- **Filtros**: sucursal, fecha **Desde** y **Hasta**. Por defecto suele mostrarse el mes actual.
- **Tabla** con: fecha y hora, sucursal, total, cantidad de ítems, método de pago y vendedor.

> **Imágenes sugeridas:** punto de venta con búsqueda y carrito; ventana de cobro con métodos de pago; historial con filtros y tabla.

---

## 9. Traspasos

Los traspasos permiten **mover stock de una sucursal a otra**.

- **Listado**: se muestran los traspasos con ID, origen, destino, estado y fecha.
- **Nuevo traspaso**: botón **Nuevo traspaso**. Elegí sucursal de origen, sucursal de destino y los ítems (producto/variante y cantidad). Al confirmar, el traspaso queda en estado “pendiente”.
- **Completar traspaso**: cuando la mercadería llega a destino, en la sección **Completar traspaso** ingresá el **ID** del traspaso y hacé clic en **Completar**. El stock se actualiza en ambas sucursales.

> **Imagen sugerida:** lista de traspasos y formulario de nuevo traspaso o de completar traspaso.

---

## 10. Reportes

En **Reportes** podés ver estadísticas por **rango de fechas**:

1. Elegí **Desde** y **Hasta** (la fecha Desde debe ser anterior o igual a Hasta).
2. Hacé clic en **Ver reporte**.

Se muestran:

- **Gráficos**: ingresos y operaciones en el período.
- **Tablas**:
  - Ingresos por categoría (con totales y cantidades).
  - Ventas por método de pago (efectivo, tarjeta, etc.).
  - Top productos más vendidos (nombre, variante, cantidad, ingresos).
  - Ventas por día (fecha, cantidad de ventas, total).

Podés **descargar** el reporte en **CSV** o **PDF** según esté disponible en pantalla.

> **Imagen sugerida:** reporte con rango de fechas, gráficos y una de las tablas.

---

## 11. Sucursales

(Solo visible si tenés permiso de administrar sucursales.)

- **Listado** de sucursales con código, nombre, ciudad y teléfono.
- **Nueva sucursal**: botón **Nueva sucursal**. Completá nombre, código (ej. SUC1), dirección, ciudad y teléfono.
- **Eliminar**: podés eliminar una sucursal desde la tabla. El sistema pedirá **confirmación** antes de borrar.

> **Imagen sugerida:** tabla de sucursales y modal de nueva sucursal.

---

## 12. Usuarios

(Solo visible si tenés permiso de administrar usuarios.)

- **Listado** de usuarios con nombre, usuario, email, rol, sucursal asignada y estado (Activo/Inactivo).
- **Roles**:
  - **Dueño** y **Encargado**: pueden gestionar sucursales y usuarios.
  - **Vendedor**: solo ventas e inventario (según configuración).
- **Nuevo usuario**: botón **Nuevo usuario**. Completá nombre, usuario, contraseña, email (opcional), rol y sucursal.
- **Editar**: podés cambiar datos o desactivar un usuario.
- **Eliminar**: disponible con **confirmación** (no se puede eliminar el único Dueño).

> **Imagen sugerida:** tabla de usuarios y modal de nuevo usuario o edición.

---

## 13. Plan

En **Plan** se muestra tu **plan actual** (Gratis, Pro, Enterprise u otro) y, si corresponde, el **período de prueba** (fecha hasta la cual es válida la prueba).

Desde el menú lateral también podés ver en la parte inferior el plan actual y un enlace **Ver plan** para ir a esta página.

> **Imagen sugerida:** página Plan con el plan actual y fecha de prueba (si aplica).

---

## 14. Cerrar sesión y otros consejos

- **Cerrar sesión**: en el menú lateral, al pie, hacé clic en **Cerrar sesión**. Volverás a la pantalla de inicio de sesión.
- **Modo oscuro**: en la cabecera del panel hay un botón (sol/luna) para cambiar entre tema claro y oscuro. La preferencia se guarda en el equipo.
- **Sesión expirada**: si la sesión vence, serás redirigido al login y verás un mensaje. Volvé a iniciar sesión.
- **Errores de red**: si algo falla, en muchas pantallas aparece un botón **Reintentar** o un mensaje para volver a cargar.
- **Exportaciones**: las descargas (CSV, Excel, PDF) pueden tardar unos segundos si hay muchos datos.

---

## Contacto y soporte

Para dudas sobre el uso de GIRO, planes o facturación, contactá al proveedor que te dio acceso al sistema.

---

*Manual de usuario GIRO — Versión 1.0*
