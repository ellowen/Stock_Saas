import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";
import { listAuditLogsController } from "../../../presentation/http/controllers/audit.controller";

const router = Router();
router.use(authMiddleware);
router.get("/", requireRole(["OWNER", "MANAGER"]), listAuditLogsController);

export const auditRouter = router;
