import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HotelService } from '@/modules/hotel/hotel.service.js';
import { prisma } from '@/shared/prisma/client.js';
import { NotFoundError } from '@/shared/errors/index.js';
import { RoomStatus, OrderStatus } from '@prisma/client';

vi.mock('@/shared/prisma/client.js', () => ({
  prisma: {
    hotel: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    room: {
      count: vi.fn(),
    },
    order: {
      count: vi.fn(),
    },
    guest: {
      count: vi.fn(),
    },
  },
}));

describe('HotelService', () => {
  let hotelService: HotelService;

  beforeEach(() => {
    hotelService = new HotelService();
    vi.clearAllMocks();
  });

  describe('getHotelProfile', () => {
    it('deve retornar o perfil e o resumo de contagens do hotel com sucesso', async () => {
      const mockHotel = {
        id: 'hotel-123',
        name: 'Hotel Plaza',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        _count: {
          employees: 5,
          roomTypes: 3,
          rooms: 20,
          guests: 50,
          orders: 30,
        },
      };

      vi.mocked(prisma.hotel.findFirst).mockResolvedValue(mockHotel as any);

      const result = await hotelService.getHotelProfile('hotel-123');

      expect(result.id).toBe('hotel-123');
      expect(result.name).toBe('Hotel Plaza');
      expect(result.summary).toEqual({
        totalEmployees: 5,
        totalRoomTypes: 3,
        totalRooms: 20,
        totalGuests: 50,
        totalOrders: 30,
      });
      expect(prisma.hotel.findFirst).toHaveBeenCalledWith({
        where: { id: 'hotel-123' },
        include: {
          _count: {
            select: {
              employees: true,
              roomTypes: true,
              rooms: true,
              guests: true,
              orders: true,
            },
          },
        },
      });
    });

    it('deve lançar NotFoundError se o hotel não for encontrado', async () => {
      vi.mocked(prisma.hotel.findFirst).mockResolvedValue(null);

      await expect(hotelService.getHotelProfile('hotel-inexistente')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateHotel', () => {
    it('deve atualizar o nome do hotel quando ele existir', async () => {
      const mockHotel = {
        id: 'hotel-123',
        name: 'Hotel Antigo',
        _count: { employees: 1, roomTypes: 1, rooms: 1, guests: 1, orders: 1 },
      };
      const mockUpdatedHotel = {
        id: 'hotel-123',
        name: 'Hotel Novo Nome',
      };

      vi.mocked(prisma.hotel.findFirst).mockResolvedValue(mockHotel as any);
      vi.mocked(prisma.hotel.update).mockResolvedValue(mockUpdatedHotel as any);

      const result = await hotelService.updateHotel('hotel-123', { name: 'Hotel Novo Nome' });

      expect(result.name).toBe('Hotel Novo Nome');
      expect(prisma.hotel.update).toHaveBeenCalledWith({
        where: { id: 'hotel-123' },
        data: { name: 'Hotel Novo Nome' },
      });
    });

    it('deve lançar NotFoundError se tentar atualizar um hotel que não existe', async () => {
      vi.mocked(prisma.hotel.findFirst).mockResolvedValue(null);

      await expect(
        hotelService.updateHotel('hotel-inexistente', { name: 'Novo Nome' })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getHotelStats', () => {
    it('deve calcular corretamente a taxa de ocupação e estatísticas de quartos, reservas e hóspedes', async () => {
      // 10 quartos no total, 2 checked_in -> 20% ocupação
      vi.mocked(prisma.room.count)
        .mockResolvedValueOnce(10) // totalRooms
        .mockResolvedValueOnce(7)  // availableRooms
        .mockResolvedValueOnce(1)  // maintenanceRooms
        .mockResolvedValueOnce(1)  // cleaningRooms
        .mockResolvedValueOnce(1); // outOfServiceRooms

      vi.mocked(prisma.order.count)
        .mockResolvedValueOnce(3)  // pendingOrders
        .mockResolvedValueOnce(4)  // confirmedOrders
        .mockResolvedValueOnce(2); // checkedInOrders

      vi.mocked(prisma.guest.count).mockResolvedValueOnce(15); // totalGuests

      const stats = await hotelService.getHotelStats('hotel-123');

      expect(stats.occupancyRate).toBe(20);
      expect(stats.rooms).toEqual({
        total: 10,
        available: 7,
        maintenance: 1,
        cleaning: 1,
        outOfService: 1,
      });
      expect(stats.orders).toEqual({
        pending: 3,
        confirmed: 4,
        checkedIn: 2,
        activeTotal: 9,
      });
      expect(stats.guests.total).toBe(15);
    });

    it('deve retornar taxa de ocupação 0% quando não houver quartos cadastrados', async () => {
      vi.mocked(prisma.room.count).mockResolvedValue(0);
      vi.mocked(prisma.order.count).mockResolvedValue(0);
      vi.mocked(prisma.guest.count).mockResolvedValue(0);

      const stats = await hotelService.getHotelStats('hotel-vazio');

      expect(stats.occupancyRate).toBe(0);
      expect(stats.rooms.total).toBe(0);
    });
  });
});
