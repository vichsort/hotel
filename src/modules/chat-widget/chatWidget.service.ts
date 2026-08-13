import { prisma } from '@/shared/prisma/client.js';
import { NotFoundError, ValidationError, ConflictError } from '@/shared/errors/index.js';
import { GuestService } from '@/modules/guest/guest.service.js';
import { OrderStatus, OrderSource, RoomStatus } from '@prisma/client';
import type { ChatWidgetOrderInput } from '@/modules/chat-widget/chatWidget.schema.js';

const guestService = new GuestService();

export class ChatWidgetService {
  async listPublicRoomTypes(hotelId: string) {
    const items = await prisma.roomType.findMany({
      where: { hotelId },
      include: {
        _count: {
          select: { rooms: true },
        },
      },
      orderBy: { basePrice: 'asc' },
    });

    return items.map((item) => {
      const { _count, ...rest } = item;
      return {
        ...rest,
        basePrice: Number(item.basePrice),
        totalRooms: _count.rooms,
      };
    });
  }

  async createChatWidgetOrder(hotelId: string, input: ChatWidgetOrderInput) {
    if (input.checkInDate >= input.checkOutDate) {
      throw new ValidationError('A data de Check-out deve ser posterior à data de Check-in.');
    }

    const roomType = await prisma.roomType.findFirst({
      where: { id: input.roomTypeId, hotelId },
    });

    if (!roomType) {
      throw new NotFoundError('Categoria de quarto', input.roomTypeId);
    }

    const totalCategoryRooms = await prisma.room.count({
      where: {
        hotelId,
        roomTypeId: input.roomTypeId,
        status: { not: RoomStatus.OUT_OF_SERVICE },
      },
    });

    if (totalCategoryRooms === 0) {
      throw new ConflictError('Não existem quartos ativos cadastrados para esta categoria.');
    }

    const overlappingOrdersCount = await prisma.order.count({
      where: {
        hotelId,
        roomTypeId: input.roomTypeId,
        status: { in: [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.CHECKED_IN] },
        AND: [
          { checkInDate: { lt: input.checkOutDate } },
          { checkOutDate: { gt: input.checkInDate } },
        ],
      },
    });

    if (overlappingOrdersCount >= totalCategoryRooms) {
      throw new ConflictError('Não há quartos disponíveis para a categoria selecionada no período informado.');
    }

    const guest = await guestService.findOrCreateGuest(hotelId, {
      name: input.guestName,
      email: input.guestEmail ?? null,
      phone: input.guestPhone ?? null,
    });

    return await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          hotelId,
          guestId: guest.id,
          roomTypeId: input.roomTypeId,
          checkInDate: input.checkInDate,
          checkOutDate: input.checkOutDate,
          numberOfGuests: input.numberOfGuests,
          status: OrderStatus.PENDING,
          source: OrderSource.CHAT_WIDGET,
          notes: input.notes ?? null,
        },
        include: {
          guest: true,
          roomType: true,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: OrderStatus.PENDING,
          toStatus: OrderStatus.PENDING,
          changedByEmployeeId: null,
        },
      });

      return order;
    });
  }
}
