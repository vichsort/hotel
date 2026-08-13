import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RoomService } from '@/modules/room/room.service.js';
import { prisma, basePrisma } from '@/shared/prisma/client.js';
import { ConflictError, NotFoundError } from '@/shared/errors/index.js';
import { RoomStatus } from '@prisma/client';

vi.mock('@/shared/prisma/client.js', () => ({
  prisma: {
    room: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    roomType: {
      findFirst: vi.fn(),
    },
    order: {
      count: vi.fn(),
    },
  },
  basePrisma: {
    room: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('RoomService', () => {
  let roomService: RoomService;

  beforeEach(() => {
    roomService = new RoomService();
    vi.clearAllMocks();
  });

  describe('createRoom', () => {
    it('deve reativar um quarto em soft delete se o número já existia e foi desativado', async () => {
      const roomTypeMock = { id: 'rt-1', hotelId: 'hotel-1' };
      const softDeletedRoom = { id: 'room-del', hotelId: 'hotel-1', number: '101', deletedAt: new Date() };
      const reactivated = { id: 'room-del', number: '101', deletedAt: null };

      vi.mocked(prisma.roomType.findFirst).mockResolvedValue(roomTypeMock as any);
      vi.mocked(basePrisma.room.findFirst).mockResolvedValue(softDeletedRoom as any);
      vi.mocked(basePrisma.room.update).mockResolvedValue(reactivated as any);

      const result = await roomService.createRoom('hotel-1', {
        roomTypeId: 'rt-1',
        number: '101',
        floor: '1',
        status: RoomStatus.AVAILABLE,
      });

      expect(result.id).toBe('room-del');
      expect(basePrisma.room.update).toHaveBeenCalled();
    });
  });

  describe('updateRoomStatus', () => {
    it('deve alterar o status operacional do quarto (governança)', async () => {
      const mockRoom = { id: 'room-1', hotelId: 'hotel-1', number: '102', status: RoomStatus.CLEANING };
      vi.mocked(prisma.room.findFirst).mockResolvedValue(mockRoom as any);
      vi.mocked(prisma.room.update).mockResolvedValue({ ...mockRoom, status: RoomStatus.AVAILABLE } as any);

      const result = await roomService.updateRoomStatus('hotel-1', 'room-1', RoomStatus.AVAILABLE);

      expect(result.status).toBe(RoomStatus.AVAILABLE);
    });
  });

  describe('deleteRoom', () => {
    it('deve lançar ConflictError ao tentar deletar um quarto com reservas ativas', async () => {
      const mockRoom = { id: 'room-1', hotelId: 'hotel-1', number: '103' };
      vi.mocked(prisma.room.findFirst).mockResolvedValue(mockRoom as any);
      vi.mocked(prisma.order.count).mockResolvedValue(2); // 2 reservas ativas vinculadas

      await expect(roomService.deleteRoom('hotel-1', 'room-1')).rejects.toThrow(ConflictError);
    });
  });
});
