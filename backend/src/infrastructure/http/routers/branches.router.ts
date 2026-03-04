import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";
import { listBranchesController, createBranchController, deleteBranchController } from "../../../presentation/http/controllers/branches.controller";

const router = Router();
router.use(authMiddleware);
router.get("/", listBranchesController);
router.post("/", requireRole(["OWNER", "MANAGER"]), createBranchController);
router.delete("/:id", requireRole(["OWNER", "MANAGER"]), deleteBranchController);
export const branchesRouter = router;
