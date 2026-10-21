import type { Role } from "../generated/prisma/client.js";
declare global {
  namespace Express {
    interface Request {
      requestId: string;
      auth?: {
        userId: string;
        role: Role;
        sessionId: string;
        verified: boolean;
        professionalId: string | null;
      };
    }
  }
}
export {};
