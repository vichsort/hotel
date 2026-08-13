import { EmployeeRole } from '@prisma/client';

export interface UserPayload {
  id: string;
  hotelId: string;
  role: EmployeeRole;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
      hotelId?: string;
    }
  }
}
