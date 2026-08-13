import { z } from 'zod';

export const createGuestSchema = z.object({
  name: z.string().min(2, 'O nome do hóspede deve ter no mínimo 2 caracteres.').max(100),
  email: z.string().email('E-mail inválido.').nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
});

export type CreateGuestInput = z.infer<typeof createGuestSchema>;

export const updateGuestSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email('E-mail inválido.').nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
});

export type UpdateGuestInput = z.infer<typeof updateGuestSchema>;

export const queryGuestSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

export type QueryGuestInput = z.infer<typeof queryGuestSchema>;
