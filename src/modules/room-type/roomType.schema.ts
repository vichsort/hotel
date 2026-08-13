import { z } from 'zod';

export const createRoomTypeSchema = z.object({
  name: z.string().min(2, 'O nome da categoria deve ter no mínimo 2 caracteres.').max(100),
  description: z.string().optional(),
  basePrice: z.coerce.number().positive('O preço base deve ser um valor positivo.'),
  images: z.array(z.string().url('URL de imagem inválida.')).default([]),
});

export type CreateRoomTypeInput = z.infer<typeof createRoomTypeSchema>;

export const updateRoomTypeSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().optional(),
  basePrice: z.coerce.number().positive('O preço base deve ser um valor positivo.').optional(),
  images: z.array(z.string().url('URL de imagem inválida.')).optional(),
});

export type UpdateRoomTypeInput = z.infer<typeof updateRoomTypeSchema>;

export const queryRoomTypeSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

export type QueryRoomTypeInput = z.infer<typeof queryRoomTypeSchema>;
