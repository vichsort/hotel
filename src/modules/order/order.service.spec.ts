import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OrderService } from '@/modules/order/order.service.js';
import { prisma } from '@/shared/prisma/client.js';
import {
  RoomUnavailableError,
  ValidationError,
  InvalidStatusTransitionError,
  ConflictError,
  NotFoundError,
} from '@/shared/errors/index.js';
import { OrderStatus, OrderSource } from '@prisma/client';

vi.mock('@/shared/prisma/client.js', () => ({
  prisma: {
    order: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    room: {
      count: vi.fn(),
      findFirst: vi.fn(),
    },
    roomType: {
      findFirst: vi.fn(),
    },
    orderStatusHistory: {
      create: vi.fn(),
    },
    $transaction: vi.fn((cb) =>
      cb({
        order: {
          create: vi.fn().mockImplementation((args) => ({ id: 'ord-created-123', ...args.data })),
          update: vi.fn().mockImplementation((args) => ({ id: args.where.id, ...args.data })),
        },
        orderStatusHistory: {
          create: vi.fn().mockResolvedValue({ id: 'hist-123' }),
        },
      })
    ),
  },
  basePrisma: {
    guest: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe('OrderService', () => {
  let orderService: OrderService;

  beforeEach(() => {
    orderService = new OrderService();
    vi.clearAllMocks();
  });

  describe('getOrderById', () => {
    it('deve retornar os detalhes da reserva quando encontrada pelo ID e hotelId', async () => {
      const mockOrder = {
        id: 'ord-123',
        hotelId: 'hotel-1',
        status: OrderStatus.PENDING,
        guest: { id: 'g-1', name: 'João Silva', email: 'joao@email.com' },
        roomType: { id: 'rt-1', name: 'Suíte Luxo', basePrice: 250 },
      };

      vi.mocked(prisma.order.findFirst).mockResolvedValue(mockOrder as any);

      const result = await orderService.getOrderById('hotel-1', 'ord-123');

      expect(result.id).toBe('ord-123');
      expect(result.guest.name).toBe('João Silva');
    });

    it('deve lançar NotFoundError se a reserva não existir no hotel', async () => {
      vi.mocked(prisma.order.findFirst).mockResolvedValue(null);

      await expect(orderService.getOrderById('hotel-1', 'ord-inexistente')).rejects.toThrow(NotFoundError);
    });
  });

  describe('createManualOrder', () => {
    it('deve lançar ValidationError se a data de check-in for maior ou igual ao check-out', async () => {
      vi.mocked(prisma.roomType.findFirst).mockResolvedValue({ id: 'rt-1' } as any);

      await expect(
        orderService.createManualOrder('hotel-1', {
          guestId: 'guest-1',
          roomTypeId: 'rt-1',
          checkInDate: new Date('2026-09-05'),
          checkOutDate: new Date('2026-09-01'),
          numberOfGuests: 1,
          source: OrderSource.MANUAL,
        })
      ).rejects.toThrow(ValidationError);
    });

    it('deve lançar ValidationError se nem guestId nem guestData forem fornecidos', async () => {
      await expect(
        orderService.createManualOrder('hotel-1', {
          roomTypeId: 'rt-1',
          checkInDate: new Date('2026-09-01'),
          checkOutDate: new Date('2026-09-05'),
          numberOfGuests: 1,
          source: OrderSource.MANUAL,
        })
      ).rejects.toThrow(ValidationError);
    });

    it('deve lançar NotFoundError se a categoria de quarto informada não existir', async () => {
      vi.mocked(prisma.roomType.findFirst).mockResolvedValue(null);

      await expect(
        orderService.createManualOrder('hotel-1', {
          guestId: 'guest-1',
          roomTypeId: 'rt-invalida',
          checkInDate: new Date('2026-09-01'),
          checkOutDate: new Date('2026-09-05'),
          numberOfGuests: 1,
          source: OrderSource.MANUAL,
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('deve lançar ConflictError se a lotação de vagas na categoria estiver esgotada', async () => {
      vi.mocked(prisma.roomType.findFirst).mockResolvedValue({ id: 'rt-1' } as any);
      vi.mocked(prisma.room.count).mockResolvedValue(2); // 2 quartos na categoria
      vi.mocked(prisma.order.count).mockResolvedValue(2); // 2 reservas sobrepostas na categoria

      await expect(
        orderService.createManualOrder('hotel-1', {
          guestId: 'guest-1',
          roomTypeId: 'rt-1',
          checkInDate: new Date('2026-09-01'),
          checkOutDate: new Date('2026-09-05'),
          numberOfGuests: 2,
          source: OrderSource.MANUAL,
        })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('updateOrderStatus', () => {
    it('deve lançar ValidationError se tentar realizar CHECKED_IN sem quarto físico associado', async () => {
      const mockOrderWithoutRoom = {
        id: 'ord-1',
        hotelId: 'hotel-1',
        status: OrderStatus.CONFIRMED,
        roomId: null,
        roomTypeId: 'rt-1',
        checkInDate: new Date('2026-08-15'),
        checkOutDate: new Date('2026-08-18'),
      };

      vi.mocked(prisma.order.findFirst).mockResolvedValue(mockOrderWithoutRoom as any);

      await expect(
        orderService.updateOrderStatus('hotel-1', 'ord-1', { status: OrderStatus.CHECKED_IN })
      ).rejects.toThrow(ValidationError);
    });

    it('deve lançar InvalidStatusTransitionError se a transição de status for inválida', async () => {
      const mockOrderCheckedOut = {
        id: 'ord-1',
        hotelId: 'hotel-1',
        status: OrderStatus.CHECKED_OUT,
        roomId: 'room-1',
        roomTypeId: 'rt-1',
      };

      vi.mocked(prisma.order.findFirst).mockResolvedValue(mockOrderCheckedOut as any);

      await expect(
        orderService.updateOrderStatus('hotel-1', 'ord-1', { status: OrderStatus.CONFIRMED })
      ).rejects.toThrow(InvalidStatusTransitionError);
    });

    it('deve lançar RoomUnavailableError em caso de sobreposição de reservas no mesmo quarto (Double-Booking)', async () => {
      const mockOrder = {
        id: 'ord-2',
        hotelId: 'hotel-1',
        status: OrderStatus.CONFIRMED,
        roomId: 'room-101',
        roomTypeId: 'rt-1',
        checkInDate: new Date('2026-08-20'),
        checkOutDate: new Date('2026-08-25'),
      };

      vi.mocked(prisma.order.findFirst).mockResolvedValueOnce(mockOrder as any); // current order
      vi.mocked(prisma.room.findFirst).mockResolvedValue({ id: 'room-101', number: '101' } as any);
      vi.mocked(prisma.order.findFirst).mockResolvedValueOnce({
        id: 'ord-conflict',
        room: { number: '101' },
      } as any); // overlapping order

      await expect(
        orderService.updateOrderStatus('hotel-1', 'ord-2', { status: OrderStatus.CHECKED_IN, roomId: 'room-101' })
      ).rejects.toThrow(RoomUnavailableError);
    });
  });

  describe('deleteOrder', () => {
    it('deve deletar a reserva com sucesso se ela for encontrada', async () => {
      vi.mocked(prisma.order.findFirst).mockResolvedValue({ id: 'ord-100', hotelId: 'hotel-1' } as any);
      vi.mocked(prisma.order.delete).mockResolvedValue({ id: 'ord-100' } as any);

      const res = await orderService.deleteOrder('hotel-1', 'ord-100');

      expect(res.message).toContain('removido com sucesso');
      expect(prisma.order.delete).toHaveBeenCalledWith({ where: { id: 'ord-100' } });
    });
  });
});
