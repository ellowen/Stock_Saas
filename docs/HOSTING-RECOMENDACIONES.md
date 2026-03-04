# Recomendaciones de hosting para desplegar GIRO

Resumen para elegir dónde subir el proyecto (frontend + backend + base de datos): **económico, estable y seguro** — relación precio/calidad.

---

## Stack del proyecto

- **Frontend:** React (Vite)
- **Backend:** Node.js + Express
- **Base de datos:** MySQL (Prisma)

---

## Recomendación principal: mejor relación precio–calidad

### **Railway**

- **Qué es:** Una sola plataforma para frontend, backend y base de datos. Conectás el repo de GitHub y desplegás todo desde el mismo lugar.
- **Precio:** Crédito gratis al mes (~5 USD). Después se paga por uso; un proyecto chico suele quedar en **~10–20 USD/mes** (backend + DB; el frontend suele salir muy barato).
- **Ventajas:** Muy fácil de usar, deploys automáticos desde Git, HTTPS y variables de entorno seguras, buena documentación. No tenés que configurar front en un lado y backend en otro.
- **Base de datos:** Podés crear MySQL (o PostgreSQL) en el mismo proyecto. Con Prisma solo configurás la `DATABASE_URL` en las variables de entorno.
- **Web:** https://railway.app

---

## Si preferís gastar poco o cero al principio

### **Render + Vercel**

- **Frontend en Vercel:** Gratis, muy bueno para React/Vite, HTTPS y CDN incluidos.
- **Backend y DB en Render:** Plan free para el backend (se “duerme” a los 15 min sin visitas; el primer request tarda unos segundos). Base PostgreSQL gratis (si migrás de MySQL a Postgres con Prisma, son cambios acotados).
- **Costo:** 0 USD mientras uses solo el free tier. Si querés el backend siempre prendido: ~7 USD/mes en Render.
- **Web:** https://render.com y https://vercel.com

---

## Resumen rápido

| Opción | Costo aprox. | Dificultad | Mejor para |
|--------|--------------|------------|------------|
| **Railway** (todo junto) | 0–20 USD/mes | Baja | Simplicidad y buena relación precio/calidad |
| **Render + Vercel** | 0 USD (free) o ~7 USD/mes (sin “sueño”) | Media | Empezar gratis o con un solo servicio pago |
| **Vercel + Render + PlanetScale** | 0 USD en free tier | Media | Mantener MySQL sin migrar a Postgres |

---

## Seguridad

En todas estas opciones tenés:

- HTTPS por defecto
- Variables de entorno (no subir `.env` al repo)
- Entornos aislados por proyecto

---

## Más detalle

Para opciones adicionales (PlanetScale, Fly.io, Supabase, Neon, etc.) y checklist antes de subir, ver **[MEJORAS-FUTURAS.md](./MEJORAS-FUTURAS.md)** (sección “Dónde subir la aplicación”).
