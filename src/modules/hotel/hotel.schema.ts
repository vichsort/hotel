import { z } from 'zod';

export const updateHotelSchema = z.object({
  name: z.string().min(2, 'O nome do hotel deve ter no mínimo 2 caracteres.').max(100),
});

export type UpdateHotelInput = z.infer<typeof updateHotelSchema>;
