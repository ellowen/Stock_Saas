import { Router } from "express";
import { loginController, registerController } from "../../../presentation/http/controllers/auth.controller";

const router = Router();

router.post("/login", loginController);
router.post("/register", registerController);

export const authRouter = router;

