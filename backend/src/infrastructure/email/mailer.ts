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

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const transporter = getTransporter();

  if (transporter) {
    await transporter.sendMail({ from: env.emailFrom, to, subject, html });
    return;
  }

  if (env.nodeEnv === "development") {
    // eslint-disable-next-line no-console
    console.log(`[DEV EMAIL] To: ${to} | Subject: ${subject}`);
  }
}
