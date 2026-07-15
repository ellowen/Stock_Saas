# Forms

`FormField.tsx` (label + input + error) es el wrapper estándar. `.input-minimal` es la clase base de cualquier input/select/textarea.

## Validación

Zod en el backend es la validación autoritativa (`CODING_STANDARDS.md`). No se confirmó en esta ronda si el frontend duplica reglas de validación con una librería (React Hook Form, Formik) o si son formularios controlados a mano con `useState` — a verificar antes de asumir un patrón único.

## Patrón encontrado que vale la pena no repetir

En `SettingsPage.tsx` (tab Company), los inputs no se deshabilitan para un usuario sin permiso de guardar — solo el botón de submit está gateado. Esto deja que el usuario complete el formulario y recién al final descubra que no puede guardar. Preferir deshabilitar el formulario completo (o mostrar un banner explicando la restricción) desde el principio.
