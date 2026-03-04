# Mostrar la app a un cliente desde tu casa (sin abrir puertos)

Podés darle un enlace público a tu cliente para que vea la app en vivo, **sin abrir puertos** en tu router. Tu PC hace de “servidor” y un servicio de túnel expone tu localhost a internet de forma temporal.

---

## Opción 1: ngrok (recomendada)

**Qué hace:** ngrok crea una URL pública (ej. `https://abc123.ngrok-free.app`) que apunta a tu PC. Quien abra esa URL ve tu app. No hace falta tocar el router ni el firewall.

### Pasos

1. **Crear cuenta y instalar ngrok** (gratis)
   - Entrá a https://ngrok.com y registrate.
   - Descargá ngrok: https://ngrok.com/download (o con Chocolatey: `choco install ngrok`).
   - Opcional: conectá tu cuenta con `ngrok config add-authtoken TU_TOKEN` (el token sale en el dashboard).

2. **Arrancar la app en tu PC**
   - Backend: en una terminal, `cd backend` → `npm run dev` (puerto 4000).
   - Frontend: en otra terminal, `cd frontend` → `npm run dev` (puerto 5173).

3. **Exponer el frontend con ngrok**
   - En una tercera terminal: `ngrok http 5173`
   - En la consola vas a ver algo como:
     ```
     Forwarding   https://abc123.ngrok-free.app -> http://localhost:5173
     ```
   - Esa URL **https://...ngrok-free.app** es la que le pasás al cliente.

4. **Abrir el enlace**
   - El cliente (o vos desde el celular) abre esa URL en el navegador.
   - La primera vez ngrok puede mostrar una pantalla de “Visit Site” (plan gratis); hacen clic y entran a la app.
   - El frontend (Vite) hace de proxy al backend en tu PC, así que todo funciona: login, ventas, inventario, etc.

5. **Cuando termines la demo**
   - Cerrando la terminal de ngrok se corta el túnel y la URL deja de funcionar. La próxima vez que ejecutes `ngrok http 5173` te dará otra URL (en el plan gratis).

**Importante:** Mientras ngrok esté corriendo, tu backend y frontend tienen que seguir encendidos en tu PC.

---

## Opción 2: localhost.run (sin instalar nada)

Si no querés instalar ngrok, podés usar **localhost.run** con SSH (Windows 10/11 suelen traer OpenSSH).

1. Backend y frontend corriendo (igual que arriba).
2. En una terminal:
   ```bash
   ssh -R 80:localhost:5173 nokey@localhost.run
   ```
3. Te van a mostrar una URL pública. Esa se la pasás al cliente.
4. Para cortar: Ctrl+C en esa terminal.

Más info: https://localhost.run

---

## Opción 3: Compartir pantalla (Zoom, Meet, etc.)

Si solo querés **mostrar** la app sin que el cliente toque nada:

- Abrís la app en tu navegador (`http://localhost:5173`).
- En la videollamada compartís pantalla (o ventana del navegador).
- El cliente ve todo en vivo; no necesita ningún enlace ni instalar nada.

No hay URL para el cliente ni túneles; solo sirve para demos guiadas.

---

## Resumen

| Método           | ¿El cliente abre un enlace? | ¿Tenés que instalar algo? | Uso típico        |
|------------------|-----------------------------|----------------------------|--------------------|
| **ngrok**        | Sí                          | Sí (ngrok)                 | Demo interactiva   |
| **localhost.run**| Sí                          | No (SSH ya viene en Windows)| Demo rápida        |
| **Compartir pantalla** | No                    | No                         | Demo guiada por vos |

Para una demo seria donde el cliente **use** la app desde su casa, lo más cómodo suele ser **ngrok**: instalás una vez y cada vez que quieras mostrarla ejecutás backend, frontend y `ngrok http 5173`.
