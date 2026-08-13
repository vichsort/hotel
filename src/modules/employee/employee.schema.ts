import { z } from 'zod';
import { EmployeeRole } from '@prisma/client';

export const createEmployeeSchema = z.object({
  name: z.string().min(2, 'O nome deve ter no mínimo 2 caracteres.').max(100),
  email: z.string().email('E-mail inválido.'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres.'),
  role: z.nativeEnum(EmployeeRole).default(EmployeeRole.STAFF),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

export const updateEmployeeSchema = z.object({
  name: z.string().min(2, 'O nome deve ter no mínimo 2 caracteres.').max(100).optional(),
  email: z.string().email('E-mail inválido.').optional(),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres.').optional(),
  role: z.nativeEnum(EmployeeRole).optional(),
});

export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;

export const queryEmployeeSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  role: z.nativeEnum(EmployeeRole).optional(),
});

export type QueryEmployeeInput = z.infer<typeof queryEmployeeSchema>;
