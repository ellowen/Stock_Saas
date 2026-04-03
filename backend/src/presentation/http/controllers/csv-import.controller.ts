import { Request, Response } from "express";
import multer from "multer";
import { CsvImportService } from "../../../application/products/csv-import.service";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"));
    }
  },
});

const service = new CsvImportService();

export const uploadMiddleware = upload.single("file");

export const importCsvController = async (req: Request, res: Response) => {
  if (!req.auth) return res.status(401).json({ message: "Unauthorized" });
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  try {
    const result = await service.importProducts(
      req.auth.companyId,
      req.auth.userId,
      req.file.buffer
    );
    return res.status(200).json(result);
  } catch (e) {
    if (e instanceof Error && e.message === "INVALID_CSV") {
      return res.status(400).json({ message: "Invalid CSV format" });
    }
    if (e instanceof Error && e.message === "EMPTY_CSV") {
      return res.status(400).json({ message: "CSV file is empty" });
    }
    console.error(e);
    return res.status(500).json({ message: "Unexpected error" });
  }
};
