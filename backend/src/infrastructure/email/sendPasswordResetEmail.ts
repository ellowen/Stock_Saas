import nodemailer from "nodemailer";
import { env } from "../../config/env";

function getTransporter() {
  if (!env.smtpHost || !env.smtpUser || !env.smtpPass) return null;
  return nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort ?? 587,
    secure: env.smtpSecure,
    auth: { user: env.smtpUser, pass: env.smtpPass },
  });
}

/**
 * Envía el email de recuperación de contraseña si SMTP está configurado.
 * En desarrollo sin SMTP, imprime el link en consola.
 */
export async function sendPasswordResetEmail(
  toEmail: string,
  resetLink: string
): Promise<void> {
  const transporter = getTransporter();
  const subject = "Recuperar contraseña - GIRO";
  const html = `
    <p>Hola,</p>
    <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en GIRO.</p>
    <p>Hacé clic en el siguiente enlace para elegir una nueva contraseña (válido por 1 hora):</p>
    <p><a href="${resetLink}">${resetLink}</a></p>
    <p>Si no solicitaste este cambio, podés ignorar este correo.</p>
    <p>— GIRO</p>
  `;

  if (transporter) {
    await transporter.sendMail({
      from: env.emailFrom,
      to: toEmail,
      subject,
      html,
    });
    return;
  }

  if (env.nodeEnv === "development") {
    // eslint-disable-next-line no-console
    console.log("[DEV] Password reset link (no SMTP configured):", resetLink);
  }
}
