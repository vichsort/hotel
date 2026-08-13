import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RoomTypeService } from '@/modules/room-type/roomType.service.js';
import { prisma } from '@/shared/prisma/client.js';
import { ConflictError, NotFoundError } from '@/shared/errors/index.js';

vi.mock('@/shared/prisma/client.js', () => ({
  prisma: {
    roomType: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('RoomTypeService', () => {
  let roomTypeService: RoomTypeService;

  beforeEach(() => {
    roomTypeService = new RoomTypeService();
    vi.clearAllMocks();
  });

  describe('deleteRoomType', () => {
    it('deve lançar ConflictError se a categoria possuir quartos vinculados', async () => {
      const mockCategoryWithRooms = {
        id: 'rt-1',
        name: 'Suíte Luxo',
        _count: { rooms: 3 },
      };

      vi.mocked(prisma.roomType.findFirst).mockResolvedValue(mockCategoryWithRooms as any);

      await expect(roomTypeService.deleteRoomType('hotel-1', 'rt-1')).rejects.toThrow(ConflictError);
    });

    it('deve remover a categoria com sucesso se não houver quartos vinculados', async () => {
      const mockEmptyCategory = {
        id: 'rt-empty',
        name: 'Suíte Master',
        _count: { rooms: 0 },
      };

      vi.mocked(prisma.roomType.findFirst).mockResolvedValue(mockEmptyCategory as any);
      vi.mocked(prisma.roomType.delete).mockResolvedValue(mockEmptyCategory as any);

      const result = await roomTypeService.deleteRoomType('hotel-1', 'rt-empty');

      expect(result.message).toContain('removida com sucesso');
    });
  });
});
