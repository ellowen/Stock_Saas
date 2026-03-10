import { Request, Response } from "express";
import { z } from "zod";
import { AuthService } from "../../../application/auth/auth.service";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const registerSchema = z.object({
  companyName: z.string().min(1, "El nombre de la empresa es obligatorio").max(200),
  fullName: z.string().min(1, "El nombre completo es obligatorio").max(200),
  username: z.string().min(1, "El usuario es obligatorio").max(100),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  email: z.string().email().optional().nullable().or(z.literal("")),
});

const forgotPasswordSchema = z.object({
  companyName: z.string().min(1, "El nombre de la empresa es obligatorio").max(200),
  email: z.string().email("Email inválido"),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token obligatorio"),
  newPassword: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

const authService = new AuthService();

export const loginController = async (req: Request, res: Response) => {
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      message: "Invalid request body",
      errors: parseResult.error.flatten(),
    });
  }

  try {
    const tokens = await authService.login(parseResult.data);
    return res.status(200).json(tokens);
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_CREDENTIALS") {
      return res.status(401).json({ message: "Usuario o contraseña incorrectos" });
    }
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Unexpected error" });
  }
};

export const registerController = async (req: Request, res: Response) => {
  const parseResult = registerSchema.safeParse({
    ...req.body,
    email: req.body.email === "" ? null : req.body.email,
  });
  if (!parseResult.success) {
    const first = parseResult.error.issues[0];
    return res.status(400).json({
      message: first?.message ?? "Datos inválidos",
      errors: parseResult.error.flatten(),
    });
  }

  const data = parseResult.data;

  try {
    const result = await authService.register({
      companyName: data.companyName,
      fullName: data.fullName,
      username: data.username,
      password: data.password,
      email: data.email ?? undefined,
    });
    return res.status(201).json({
      message: "Empresa y usuario creados. Ya podés iniciar sesión.",
      userId: result.userId,
      companyId: result.companyId,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "USERNAME_TAKEN") {
        return res.status(409).json({ message: "Ese nombre de usuario ya está en uso. Elegí otro." });
      }
      if (error.message === "USERNAME_REQUIRED" || error.message === "COMPANY_NAME_REQUIRED") {
        return res.status(400).json({ message: error.message });
      }
    }
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Error al crear la cuenta" });
  }
};

export const forgotPasswordController = async (req: Request, res: Response) => {
  const parseResult = forgotPasswordSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      message: "Empresa y email son obligatorios. Revisá los datos.",
      errors: parseResult.error.flatten(),
    });
  }

  try {
    await authService.forgotPassword(parseResult.data.companyName, parseResult.data.email);
    return res.status(200).json({
      message: "Si la empresa y el correo están registrados, recibirás un enlace para restablecer tu contraseña.",
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Error inesperado" });
  }
};

export const resetPasswordController = async (req: Request, res: Response) => {
  const parseResult = resetPasswordSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      message: parseResult.error.issues[0]?.message ?? "Datos inválidos",
      errors: parseResult.error.flatten(),
    });
  }

  try {
    await authService.resetPassword(parseResult.data.token, parseResult.data.newPassword);
    return res.status(200).json({
      message: "Contraseña actualizada. Ya podés iniciar sesión.",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_OR_EXPIRED_TOKEN") {
      return res.status(400).json({
        message: "El enlace expiró o no es válido. Solicitá uno nuevo.",
      });
    }
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Error inesperado" });
  }
};

