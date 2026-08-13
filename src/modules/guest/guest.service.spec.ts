import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GuestService } from '@/modules/guest/guest.service.js';
import { prisma, basePrisma } from '@/shared/prisma/client.js';
import { NotFoundError } from '@/shared/errors/index.js';

vi.mock('@/shared/prisma/client.js', () => ({
  prisma: {
    guest: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
  basePrisma: {
    guest: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('GuestService', () => {
  let guestService: GuestService;

  beforeEach(() => {
    guestService = new GuestService();
    vi.clearAllMocks();
  });

  describe('listGuests', () => {
    it('deve listar hóspedes paginados', async () => {
      const mockGuests = [{ id: 'g-1', name: 'Maria Silva', email: 'maria@email.com' }];
      vi.mocked(prisma.guest.count).mockResolvedValue(1);
      vi.mocked(prisma.guest.findMany).mockResolvedValue(mockGuests as any);

      const result = await guestService.listGuests('hotel-1', { page: 1, limit: 10, search: 'Maria' });

      expect(result.items).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('getGuestById', () => {
    it('deve retornar o hóspede com seu histórico de reservas', async () => {
      const mockGuest = {
        id: 'g-1',
        hotelId: 'hotel-1',
        name: 'Maria Silva',
        orders: [{ id: 'ord-1', status: 'CHECKED_OUT' }],
      };
      vi.mocked(prisma.guest.findFirst).mockResolvedValue(mockGuest as any);

      const result = await guestService.getGuestById('hotel-1', 'g-1');

      expect(result.id).toBe('g-1');
      expect(result.orders).toHaveLength(1);
    });

    it('deve lançar NotFoundError se o hóspede não for encontrado', async () => {
      vi.mocked(prisma.guest.findFirst).mockResolvedValue(null);

      await expect(guestService.getGuestById('hotel-1', 'g-999')).rejects.toThrow(NotFoundError);
    });
  });

  describe('findOrCreateGuest', () => {
    it('deve retornar o hóspede se ele já estiver ativo', async () => {
      const activeGuest = { id: 'g-active', name: 'Maria Silva', email: 'maria@email.com', deletedAt: null };
      vi.mocked(basePrisma.guest.findFirst).mockResolvedValue(activeGuest as any);

      const result = await guestService.findOrCreateGuest('hotel-1', { name: 'Maria Silva', email: 'maria@email.com' });

      expect(result.id).toBe('g-active');
      expect(basePrisma.guest.update).not.toHaveBeenCalled();
    });

    it('deve reativar o hóspede se ele for encontrado em soft delete', async () => {
      const deletedGuest = { id: 'g-deleted', name: 'Maria Antiga', email: 'maria@email.com', deletedAt: new Date() };
      const reactivated = { id: 'g-deleted', name: 'Maria Silva Nova', email: 'maria@email.com', deletedAt: null };

      vi.mocked(basePrisma.guest.findFirst).mockResolvedValue(deletedGuest as any);
      vi.mocked(basePrisma.guest.update).mockResolvedValue(reactivated as any);

      const result = await guestService.findOrCreateGuest('hotel-1', { name: 'Maria Silva Nova', email: 'maria@email.com' });

      expect(result.id).toBe('g-deleted');
      expect(basePrisma.guest.update).toHaveBeenCalled();
    });

    it('deve criar um novo hóspede caso não encontre nenhum registro', async () => {
      vi.mocked(basePrisma.guest.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.guest.create).mockResolvedValue({ id: 'g-new', name: 'João Silva', email: 'joao@email.com' } as any);

      const result = await guestService.findOrCreateGuest('hotel-1', { name: 'João Silva', email: 'joao@email.com' });

      expect(result.id).toBe('g-new');
      expect(prisma.guest.create).toHaveBeenCalled();
    });
  });
});
