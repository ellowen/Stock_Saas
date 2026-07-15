# Contexts

3 contexts confirmados en `frontend/src/contexts/`: `AuthContext` (usuario, empresa, permisos efectivos, login/logout/refresh), `ToastContext` (cola de notificaciones), `ThemeContext` (modo claro/oscuro).

## `AuthContext` — el más complejo, vale la pena entender su fallback

`loadPermissions()`: si `role === "OWNER"`, todos los permisos sin llamar a la API. Si no, llama `GET /permissions/users/:id`. **Si esa llamada falla, cae a un fallback local `ROLE_DEFAULT_PERMISSIONS`** (solo defaults del rol, sin overrides) — un usuario con overrides especiales vería temporalmente menos o más de lo que le corresponde si el endpoint de permisos falla justo en la carga. Es un fallback razonable (mejor eso que bloquear el login), pero vale la pena que cualquier debugging de "por qué no veo X botón" considere esta posibilidad.

`canManageUsers`/`canManageBranches` están hardcodeados a `role === "OWNER" || role === "MANAGER"` en vez de derivar de `hasPermission()` — ver la inconsistencia real documentada en `modules/Users.md` y `modules/Branches.md`.

No se confirmó en esta ronda si hace falta un context nuevo para algo pendiente — la regla de `STATE_MANAGEMENT.md` (Context solo para lo verdaderamente global) se ha respetado hasta ahora sin necesidad de agregar un cuarto.
