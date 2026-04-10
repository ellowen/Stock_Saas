import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";
import { listUsersController, createUserController, updateUserController, deleteUserController } from "../../../presentation/http/controllers/users.controller";
import { checkUserLimit } from "../../../application/billing/plan-limits";

const router = Router();
router.use(authMiddleware);
router.get("/", requireRole(["OWNER", "MANAGER"]), listUsersController);
router.post("/", requireRole(["OWNER", "MANAGER"]), checkUserLimit, createUserController);
router.put("/:id", requireRole(["OWNER", "MANAGER"]), updateUserController);
router.delete("/:id", requireRole(["OWNER", "MANAGER"]), deleteUserController);
export const usersRouter = router;
