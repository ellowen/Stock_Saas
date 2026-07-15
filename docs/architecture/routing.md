# Routing (Frontend)

React Router, definido en `frontend/src/App.tsx`. Rutas de la app bajo `/app/*` (protegidas, requieren sesión), rutas públicas fuera de ese prefijo (`/`, `/login`, `/register`, `/forgot-password`, `/reset-password`).

Ver `NAVIGATION.md` para el mapeo completo de rutas ↔ ítems de sidebar ↔ permisos. Nota clave ya documentada ahí: **el sidebar no es la única forma de llegar a una ruta protegida** — si la página no repite el chequeo de permiso/rol de forma independiente del ítem de menú, un usuario puede navegar directo por URL y entrar igual. Confirmado que esto ocurre en `UsersPage.tsx`/`BranchesPage.tsx` (gate hardcodeado a rol, no al permiso granular — ver `modules/Users.md`).

## Patrón de guard de página

`if (!tienePermiso) return <Navigate to="/app/dashboard" />` al principio del componente de página. Es responsabilidad de cada página implementarlo — no hay un HOC/wrapper centralizado de rutas protegidas por permiso (a diferencia de la protección de sesión en sí, que si es centralizada vía un layout/route guard de nivel superior para `/app/*`).
