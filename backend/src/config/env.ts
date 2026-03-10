import dotenv from "dotenv";

dotenv.config();

const required = (value: string | undefined, name: string): string => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parseInt(process.env.PORT ?? "4000", 10),
  databaseUrl: required(process.env.DATABASE_URL, "DATABASE_URL"),
  jwtSecret: required(process.env.JWT_SECRET, "JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "15m",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? required(process.env.JWT_SECRET, "JWT_SECRET"),
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
  // Recuperación de contraseña (opcionales)
  appUrl: process.env.APP_URL ?? "http://localhost:5173",
  smtpHost: process.env.SMTP_HOST,
  smtpPort: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined,
  smtpSecure: process.env.SMTP_SECURE === "true",
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  emailFrom: process.env.EMAIL_FROM ?? "noreply@giro.app",
};

