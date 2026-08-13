import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '@/modules/auth/auth.service.js';
import { prisma } from '@/shared/prisma/client.js';
import { EmailAlreadyInUseError, InvalidCredentialsError, NotFoundError } from '@/shared/errors/index.js';
import bcrypt from 'bcrypt';
import { EmployeeRole } from '@prisma/client';

vi.mock('@/shared/prisma/client.js', () => ({
  prisma: {
    employee: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    hotel: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  basePrisma: {
    employee: {
      findFirst: vi.fn(),
    },
  },
}));

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    vi.clearAllMocks();
  });

  describe('registerHotel', () => {
    it('deve registrar o hotel e o administrador com sucesso', async () => {
      const mockInput = {
        hotelName: 'Hotel Solar',
        adminName: 'Carlos Admin',
        adminEmail: 'carlos@solar.com',
        adminPassword: 'password123',
      };

      vi.mocked(prisma.employee.findFirst).mockResolvedValue(null);

      const mockHotel = { id: 'hotel-123', name: 'Hotel Solar' };
      const mockAdmin = {
        id: 'user-123',
        hotelId: 'hotel-123',
        name: 'Carlos Admin',
        email: 'carlos@solar.com',
        role: EmployeeRole.ADMIN,
      };

      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
        return cb({
          hotel: { create: vi.fn().mockResolvedValue(mockHotel) },
          employee: { create: vi.fn().mockResolvedValue(mockAdmin) },
        });
      });

      const result = await authService.registerHotel(mockInput);

      expect(result).toHaveProperty('token');
      expect(result.user).toEqual({
        id: 'user-123',
        name: 'Carlos Admin',
        email: 'carlos@solar.com',
        role: EmployeeRole.ADMIN,
      });
      expect(result.hotel).toEqual({
        id: 'hotel-123',
        name: 'Hotel Solar',
      });
    });

    it('deve lançar EmailAlreadyInUseError se o e-mail já estiver cadastrado no sistema', async () => {
      const mockInput = {
        hotelName: 'Hotel Solar',
        adminName: 'Carlos Admin',
        adminEmail: 'carlos@solar.com',
        adminPassword: 'password123',
      };

      vi.mocked(prisma.employee.findFirst).mockResolvedValue({
        id: 'user-existing',
      } as any);

      await expect(authService.registerHotel(mockInput)).rejects.toThrow(EmailAlreadyInUseError);
    });
  });

  describe('login', () => {
    it('deve realizar login com sucesso quando credenciais e hotelId forem válidos', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      const mockEmployee = {
        id: 'user-123',
        hotelId: 'hotel-123',
        name: 'Carlos Admin',
        email: 'carlos@solar.com',
        passwordHash,
        role: EmployeeRole.ADMIN,
        hotel: { id: 'hotel-123', name: 'Hotel Solar' },
      };

      vi.mocked(prisma.employee.findFirst).mockResolvedValue(mockEmployee as any);

      const result = await authService.login({
        hotelId: 'hotel-123',
        email: 'carlos@solar.com',
        password: 'password123',
      });

      expect(result).toHaveProperty('token');
      expect(result.user.id).toBe('user-123');
      expect(result.hotel.id).toBe('hotel-123');
    });

    it('deve lançar InvalidCredentialsError se o funcionário não for encontrado no hotel especificado', async () => {
      vi.mocked(prisma.employee.findFirst).mockResolvedValue(null);

      await expect(
        authService.login({
          hotelId: 'hotel-errado',
          email: 'inexistente@solar.com',
          password: 'password123',
        })
      ).rejects.toThrow(InvalidCredentialsError);
    });

    it('deve lançar InvalidCredentialsError se a senha estiver incorreta', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      const mockEmployee = {
        id: 'user-123',
        hotelId: 'hotel-123',
        name: 'Carlos Admin',
        email: 'carlos@solar.com',
        passwordHash,
        role: EmployeeRole.ADMIN,
        hotel: { id: 'hotel-123', name: 'Hotel Solar' },
      };

      vi.mocked(prisma.employee.findFirst).mockResolvedValue(mockEmployee as any);

      await expect(
        authService.login({
          hotelId: 'hotel-123',
          email: 'carlos@solar.com',
          password: 'senha_errada',
        })
      ).rejects.toThrow(InvalidCredentialsError);
    });
  });

  describe('getProfile', () => {
    it('deve retornar o perfil do usuário quando encontrado', async () => {
      const mockEmployee = {
        id: 'user-123',
        hotelId: 'hotel-123',
        name: 'Carlos Admin',
        email: 'carlos@solar.com',
        role: EmployeeRole.ADMIN,
        hotel: { id: 'hotel-123', name: 'Hotel Solar' },
      };

      vi.mocked(prisma.employee.findUnique).mockResolvedValue(mockEmployee as any);

      const result = await authService.getProfile('user-123');

      expect(result.user.id).toBe('user-123');
      expect(result.hotel.name).toBe('Hotel Solar');
    });

    it('deve lançar NotFoundError se o usuário não for encontrado', async () => {
      vi.mocked(prisma.employee.findUnique).mockResolvedValue(null);

      await expect(authService.getProfile('user-inexistente')).rejects.toThrow(NotFoundError);
    });
  });
});
