import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";
import { listBranchesController, createBranchController, deleteBranchController } from "../../../presentation/http/controllers/branches.controller";
import { checkBranchLimit } from "../../../application/billing/plan-limits";

const router = Router();
router.use(authMiddleware);
router.get("/", listBranchesController);
router.post("/", requireRole(["OWNER", "MANAGER"]), checkBranchLimit, createBranchController);
router.delete("/:id", requireRole(["OWNER", "MANAGER"]), deleteBranchController);
export const branchesRouter = router;
