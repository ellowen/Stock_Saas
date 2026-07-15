import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/requirePermission";
import { listUsersController, createUserController, updateUserController, deleteUserController } from "../../../presentation/http/controllers/users.controller";
import { checkUserLimit } from "../../../application/billing/plan-limits";

const router = Router();
router.use(authMiddleware);
router.get("/", requirePermission("USERS_MANAGE"), listUsersController);
router.post("/", requirePermission("USERS_MANAGE"), checkUserLimit, createUserController);
router.put("/:id", requirePermission("USERS_MANAGE"), updateUserController);
router.delete("/:id", requirePermission("USERS_MANAGE"), deleteUserController);
export const usersRouter = router;
