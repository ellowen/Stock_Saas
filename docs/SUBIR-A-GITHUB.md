# Cómo subir (push) a GitHub

El repo ya está inicializado y el primer commit está hecho. Solo falta **autenticarte** y hacer el push.

---

## Opción 1: Personal Access Token (HTTPS)

1. En GitHub: **Settings** (tu perfil) → **Developer settings** → **Personal access tokens** → **Tokens (classic)**.
2. **Generate new token (classic)**. Dale un nombre (ej. "Stock_Saas"), marcar al menos el permiso **repo**.
3. Copiá el token (solo se muestra una vez).

4. En la terminal, desde la carpeta del proyecto:

   ```bash
   git push -u origin main
   ```

5. Cuando pida **Username**: tu usuario de GitHub (`ellowen`).
6. Cuando pida **Password**: pegá el **token** (no tu contraseña de GitHub).

Listo. Para futuros push ya no debería pedir usuario/token si guardaste la credencial.

---

## Opción 2: SSH

1. Si aún no tenés una clave SSH:
   ```bash
   ssh-keygen -t ed25519 -C "tu-email@ejemplo.com"
   ```
   (Enter para aceptar la ruta por defecto, y opcionalmente una passphrase.)

2. Copiá la clave pública al portapapeles:
   - Windows (PowerShell): `Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub | Set-Clipboard`
   - O abrí `C:\Users\TuUsuario\.ssh\id_ed25519.pub` y copiá el contenido.

3. En GitHub: **Settings** → **SSH and GPG keys** → **New SSH key**. Pegá la clave y guardá.

4. Cambiá el remote a SSH y hacé push:
   ```bash
   git remote set-url origin git@github.com:ellowen/Stock_Saas.git
   git push -u origin main
   ```

---

## Resumen de lo ya hecho

- `git init`
- `.gitignore` en la raíz (no se sube `node_modules`, `.env`, etc.)
- `git add .` y `git commit -m "Initial commit: GIRO - frontend, backend, docs"`
- `git remote add origin https://github.com/ellowen/Stock_Saas.git`
- Rama renombrada a `main`

El archivo **`backend/.env`** no se sube (está en `.gitignore`). En otra máquina o al clonar, hay que crear ese archivo con las variables necesarias (ver `backend/.env` o documentación).
