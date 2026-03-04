export interface User {
  id: number;
  companyId: number;
  branchId?: number | null;
  username: string;
  email?: string | null;
  passwordHash: string;
  fullName: string;
  role: "OWNER" | "MANAGER" | "SELLER";
  isActive: boolean;
}

