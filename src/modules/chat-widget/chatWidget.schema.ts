import { z } from 'zod';

export const chatWidgetOrderSchema = z.object({
  guestName: z.string().min(2, 'O nome do hóspede é obrigatório.'),
  guestEmail: z.string().email('E-mail inválido.').nullable().optional(),
  guestPhone: z.string().nullable().optional(),
  roomTypeId: z.string().uuid('ID do tipo de quarto inválido.'),
  checkInDate: z.coerce.date(),
  checkOutDate: z.coerce.date(),
  numberOfGuests: z.coerce.number().int().min(1, 'Mínimo de 1 hóspede.').default(1),
  notes: z.string().nullable().optional(),
}).refine((data) => data.checkOutDate > data.checkInDate, {
  message: 'A data de check-out deve ser posterior à data de check-in.',
  path: ['checkOutDate'],
});

export type ChatWidgetOrderInput = z.infer<typeof chatWidgetOrderSchema>;
