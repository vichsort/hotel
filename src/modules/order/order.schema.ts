import { z } from 'zod';
import { OrderStatus, OrderSource } from '@prisma/client';

export const createOrderSchema = z.object({
  guestId: z.string().uuid('ID do hóspede inválido.').optional(),
  guestData: z
    .object({
      name: z.string().min(2, 'O nome do hóspede deve ter no mínimo 2 caracteres.'),
      email: z.string().email('E-mail inválido.').nullable().optional(),
      phone: z.string().nullable().optional(),
    })
    .optional(),
  roomTypeId: z.string().uuid('ID do tipo de quarto inválido.'),
  roomId: z.string().uuid('ID do quarto físico inválido.').nullable().optional(),
  checkInDate: z.coerce.date(),
  checkOutDate: z.coerce.date(),
  numberOfGuests: z.coerce.number().int().min(1, 'Mínimo de 1 hóspede.').default(1),
  source: z.nativeEnum(OrderSource).default(OrderSource.MANUAL),
  notes: z.string().nullable().optional(),
}).refine((data) => data.guestId || data.guestData, {
  message: 'É necessário fornecer o guestId ou os dados do hóspede (guestData).',
  path: ['guestId'],
}).refine((data) => data.checkOutDate > data.checkInDate, {
  message: 'A data de check-out deve ser posterior à data de check-in.',
  path: ['checkOutDate'],
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const csvImportOrderSchema = z.array(
  z.object({
    guestName: z.string().min(2),
    guestEmail: z.string().email().nullable().optional(),
    guestPhone: z.string().nullable().optional(),
    roomTypeId: z.string().uuid(),
    checkInDate: z.coerce.date(),
    checkOutDate: z.coerce.date(),
    numberOfGuests: z.coerce.number().int().min(1).default(1),
    notes: z.string().nullable().optional(),
  })
);

export type CsvImportOrderInput = z.infer<typeof csvImportOrderSchema>;

export const updateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  roomId: z.string().uuid('ID do quarto físico inválido.').nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

export const queryOrderSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.nativeEnum(OrderStatus).optional(),
  source: z.nativeEnum(OrderSource).optional(),
  roomTypeId: z.string().uuid().optional(),
  roomId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export type QueryOrderInput = z.infer<typeof queryOrderSchema>;
