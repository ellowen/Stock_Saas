import { Router } from "express";
import { loginController, registerController, forgotPasswordController, resetPasswordController } from "../../../presentation/http/controllers/auth.controller";

const router = Router();

router.post("/login", loginController);
router.post("/register", registerController);
router.post("/forgot-password", forgotPasswordController);
router.post("/reset-password", resetPasswordController);

export const authRouter = router;

