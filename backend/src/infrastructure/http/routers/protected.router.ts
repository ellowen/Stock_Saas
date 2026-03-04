import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { meController } from "../../../presentation/http/controllers/me.controller";

const router = Router();

router.get("/example", authMiddleware, (req, res) => {
  return res.json({
    message: "You are authenticated",
    auth: req.auth,
  });
});

router.get("/me", authMiddleware, meController);

export const protectedRouter = router;

