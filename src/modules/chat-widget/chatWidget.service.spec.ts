import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChatWidgetService } from '@/modules/chat-widget/chatWidget.service.js';
import { prisma } from '@/shared/prisma/client.js';
import { NotFoundError, ConflictError, ValidationError } from '@/shared/errors/index.js';

vi.mock('@/shared/prisma/client.js', () => ({
  prisma: {
    roomType: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    room: {
      count: vi.fn(),
    },
    order: {
      count: vi.fn(),
      create: vi.fn(),
    },
    orderStatusHistory: {
      create: vi.fn(),
    },
    $transaction: vi.fn((cb) =>
      cb({
        order: {
          create: vi.fn().mockImplementation((args) => ({ id: 'order-chat-1', ...args.data })),
        },
        orderStatusHistory: {
          create: vi.fn().mockResolvedValue({ id: 'hist-chat-1' }),
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

describe('ChatWidgetService', () => {
  let chatWidgetService: ChatWidgetService;

  beforeEach(() => {
    chatWidgetService = new ChatWidgetService();
    vi.clearAllMocks();
  });

  describe('listPublicRoomTypes', () => {
    it('deve listar categorias de quartos com a contagem total de quartos e preço convertido em Number', async () => {
      const mockRoomTypes = [
        {
          id: 'rt-1',
          name: 'Standard',
          basePrice: '150.00',
          _count: { rooms: 4 },
        },
        {
          id: 'rt-2',
          name: 'Luxo',
          basePrice: '350.50',
          _count: { rooms: 2 },
        },
      ];

      vi.mocked(prisma.roomType.findMany).mockResolvedValue(mockRoomTypes as any);

      const result = await chatWidgetService.listPublicRoomTypes('hotel-1');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'rt-1',
        name: 'Standard',
        basePrice: 150,
        totalRooms: 4,
      });
      expect(result[1]!.basePrice).toBe(350.5);
    });
  });

  describe('createChatWidgetOrder', () => {
    it('deve lançar ValidationError se a data de check-out for anterior ou igual ao check-in', async () => {
      await expect(
        chatWidgetService.createChatWidgetOrder('hotel-1', {
          guestName: 'Hóspede Teste',
          roomTypeId: 'rt-1',
          checkInDate: new Date('2026-10-10'),
          checkOutDate: new Date('2026-10-09'),
          numberOfGuests: 1,
        })
      ).rejects.toThrow(ValidationError);
    });

    it('deve lançar NotFoundError se a categoria de quarto não existir no hotel', async () => {
      vi.mocked(prisma.roomType.findFirst).mockResolvedValue(null);

      await expect(
        chatWidgetService.createChatWidgetOrder('hotel-1', {
          guestName: 'Hóspede Teste',
          roomTypeId: 'rt-invalid',
          checkInDate: new Date('2026-10-10'),
          checkOutDate: new Date('2026-10-15'),
          numberOfGuests: 1,
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('deve lançar ConflictError se não houver disponibilidade de vagas na categoria', async () => {
      vi.mocked(prisma.roomType.findFirst).mockResolvedValue({ id: 'rt-1' } as any);
      vi.mocked(prisma.room.count).mockResolvedValue(1); // 1 quarto na categoria
      vi.mocked(prisma.order.count).mockResolvedValue(1); // 1 reserva no mesmo período

      await expect(
        chatWidgetService.createChatWidgetOrder('hotel-1', {
          guestName: 'Hóspede Teste',
          roomTypeId: 'rt-1',
          checkInDate: new Date('2026-10-10'),
          checkOutDate: new Date('2026-10-15'),
          numberOfGuests: 1,
        })
      ).rejects.toThrow(ConflictError);
    });
  });
});
