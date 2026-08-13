import { z } from 'zod';

export const registerHotelSchema = z.object({
  hotelName: z.string().min(2, 'O nome do hotel deve ter no mínimo 2 caracteres.').max(100),
  adminName: z.string().min(2, 'O nome do administrador deve ter no mínimo 2 caracteres.').max(100),
  adminEmail: z.string().email('E-mail inválido.').toLowerCase(),
  adminPassword: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres.'),
});

export type RegisterHotelInput = z.infer<typeof registerHotelSchema>;

export const loginSchema = z.object({
  hotelId: z.string().uuid('O ID do hotel é obrigatório para realizar o login.'),
  email: z.string().email('E-mail inválido.').toLowerCase(),
  password: z.string().min(1, 'A senha é obrigatória.'),
});

export type LoginInput = z.infer<typeof loginSchema>;
