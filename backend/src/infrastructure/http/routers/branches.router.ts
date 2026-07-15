import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/requirePermission";
import { listBranchesController, createBranchController, deleteBranchController } from "../../../presentation/http/controllers/branches.controller";
import { checkBranchLimit } from "../../../application/billing/plan-limits";

const router = Router();
router.use(authMiddleware);
router.get("/", listBranchesController);
router.post("/", requirePermission("SETTINGS_MANAGE"), checkBranchLimit, createBranchController);
router.delete("/:id", requirePermission("SETTINGS_MANAGE"), deleteBranchController);
export const branchesRouter = router;
