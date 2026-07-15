# Authentication

JWT: access token (15 min) + refresh token (7 días), emitidos en `POST /auth/login`. Reset de contraseña vía `PasswordResetToken` de un solo uso + email (Nodemailer).

## No confirmado en esta ronda (pendiente verificar antes de asumir)

- Si el refresh token rota en cada uso (invalidando el anterior) o es reusable hasta su expiración natural.
- Si hay algún mecanismo de revocación de sesión (ej. "cerrar sesión en todos los dispositivos").
- Rate limiting en `/auth/login` contra fuerza bruta — no confirmado.

## Flujo de refresh

`authFetch()` (frontend) intercepta un 401, intenta refrescar el token una vez, y si falla redirige a `/login`. Ver `architecture/frontend.md` y `ERROR_HANDLING.md`.

## Alta de cuenta

Registro en 3 pasos (empresa → cuenta → confirmación), crea la `Company` con `plan: FREE`, `subscriptionStatus: trialing`, `trialEndsAt: +90 días` (ver `modules/Subscription.md`).
