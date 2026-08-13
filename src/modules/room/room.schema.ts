import { z } from 'zod';
import { RoomStatus } from '@prisma/client';

export const createRoomSchema = z.object({
  roomTypeId: z.string().uuid('ID do tipo de quarto inválido.'),
  number: z.string().min(1, 'O número do quarto é obrigatório.').max(20),
  floor: z.string().max(20).optional(),
  status: z.nativeEnum(RoomStatus).default(RoomStatus.AVAILABLE),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;

export const updateRoomSchema = z.object({
  roomTypeId: z.string().uuid('ID do tipo de quarto inválido.').optional(),
  number: z.string().min(1).max(20).optional(),
  floor: z.string().max(20).optional(),
  status: z.nativeEnum(RoomStatus).optional(),
});

export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;

export const updateRoomStatusSchema = z.object({
  status: z.nativeEnum(RoomStatus, { message: 'Status operacional inválido.' }),
});

export type UpdateRoomStatusInput = z.infer<typeof updateRoomStatusSchema>;

export const queryRoomSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  roomTypeId: z.string().uuid().optional(),
  status: z.nativeEnum(RoomStatus).optional(),
});

export type QueryRoomInput = z.infer<typeof queryRoomSchema>;
