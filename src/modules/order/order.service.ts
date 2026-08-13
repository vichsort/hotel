import { prisma } from '@/shared/prisma/client.js';
import { NotFoundError, InvalidStatusTransitionError, ValidationError, RoomUnavailableError, ConflictError } from '@/shared/errors/index.js';
import { GuestService } from '@/modules/guest/guest.service.js';
import { OrderStatus, OrderSource, RoomStatus } from '@prisma/client';
import { VALID_ORDER_STATUS_TRANSITIONS } from '@/config/constants.js';
import type {
  CreateOrderInput,
  CsvImportOrderInput,
  UpdateOrderStatusInput,
  QueryOrderInput,
} from '@/modules/order/order.schema.js';

const guestService = new GuestService();

export class OrderService {
  /**
   * Valida a disponibilidade total de vagas na categoria para o período desejado
   */
  private async validateCategoryAvailability(
    hotelId: string,
    roomTypeId: string,
    checkInDate: Date,
    checkOutDate: Date,
    excludeOrderId?: string
  ) {
    if (checkInDate >= checkOutDate) {
      throw new ValidationError('A data de Check-out deve ser posterior à data de Check-in.');
    }

    const totalCategoryRooms = await prisma.room.count({
      where: {
        hotelId,
        roomTypeId,
        status: { not: RoomStatus.OUT_OF_SERVICE },
      },
    });

    if (totalCategoryRooms === 0) {
      throw new ConflictError('Não existem quartos ativos cadastrados para esta categoria.');
    }

    const overlappingOrdersCount = await prisma.order.count({
      where: {
        hotelId,
        roomTypeId,
        status: { in: [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.CHECKED_IN] },
        ...(excludeOrderId ? { id: { not: excludeOrderId } } : {}),
        AND: [
          { checkInDate: { lt: checkOutDate } },
          { checkOutDate: { gt: checkInDate } },
        ],
      },
    });

    if (overlappingOrdersCount >= totalCategoryRooms) {
      throw new ConflictError('Não há quartos disponíveis para a categoria selecionada no período informado.');
    }
  }

  /**
   * Valida se um quarto físico específico não possui sobreposição (Double-Booking)
   */
  private async validatePhysicalRoomAvailability(
    hotelId: string,
    roomId: string,
    checkInDate: Date,
    checkOutDate: Date,
    excludeOrderId?: string
  ) {
    const room = await prisma.room.findFirst({
      where: { id: roomId, hotelId },
    });

    if (!room) {
      throw new NotFoundError('Quarto físico', roomId);
    }

    const overlappingOrder = await prisma.order.findFirst({
      where: {
        hotelId,
        roomId,
        status: { in: [OrderStatus.CONFIRMED, OrderStatus.CHECKED_IN] },
        ...(excludeOrderId ? { id: { not: excludeOrderId } } : {}),
        AND: [
          { checkInDate: { lt: checkOutDate } },
          { checkOutDate: { gt: checkInDate } },
        ],
      },
    });

    if (overlappingOrder) {
      throw new RoomUnavailableError(room.number);
    }
  }

  async listOrders(hotelId: string, query: QueryOrderInput) {
    const { page, limit, search, status, source, roomTypeId, roomId, startDate, endDate } = query;
    const skip = (page - 1) * limit;
    const cleanSearch = search?.trim();

    const whereCondition = {
      hotelId,
      ...(status ? { status } : {}),
      ...(source ? { source } : {}),
      ...(roomTypeId ? { roomTypeId } : {}),
      ...(roomId ? { roomId } : {}),
      ...(startDate || endDate
        ? {
            checkInDate: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {}),
            },
          }
        : {}),
      ...(cleanSearch
        ? {
            OR: [
              { guest: { name: { contains: cleanSearch, mode: 'insensitive' as const } } },
              { guest: { email: { contains: cleanSearch, mode: 'insensitive' as const } } },
              { guest: { phone: { contains: cleanSearch, mode: 'insensitive' as const } } },
              { roomType: { name: { contains: cleanSearch, mode: 'insensitive' as const } } },
              { room: { number: { contains: cleanSearch, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.order.count({ where: whereCondition }),
      prisma.order.findMany({
        where: whereCondition,
        include: {
          guest: {
            select: { id: true, name: true, email: true, phone: true },
          },
          roomType: {
            select: { id: true, name: true, basePrice: true },
          },
          room: {
            select: { id: true, number: true, floor: true, status: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOrderById(hotelId: string, id: string) {
    const order = await prisma.order.findFirst({
      where: { id, hotelId },
      include: {
        guest: {
          select: { id: true, name: true, email: true, phone: true },
        },
        roomType: {
          select: { id: true, name: true, basePrice: true },
        },
        room: {
          select: { id: true, number: true, floor: true, status: true },
        },
        statusHistory: {
          include: {
            changedByEmployee: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
          orderBy: { changedAt: 'asc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundError('Pedido de reserva', id);
    }

    return order;
  }

  async createManualOrder(hotelId: string, input: CreateOrderInput, employeeId?: string) {
    let guestId = input.guestId;

    if (!guestId && input.guestData) {
      const guest = await guestService.findOrCreateGuest(hotelId, {
        name: input.guestData.name,
        email: input.guestData.email ?? null,
        phone: input.guestData.phone ?? null,
      });
      guestId = guest.id;
    }

    if (!guestId) {
      throw new ValidationError('Hóspede não identificado.');
    }

    const roomType = await prisma.roomType.findFirst({
      where: { id: input.roomTypeId, hotelId },
    });
    if (!roomType) {
      throw new NotFoundError('Categoria de quarto', input.roomTypeId);
    }

    // Validação de disponibilidade de vagas na categoria
    await this.validateCategoryAvailability(
      hotelId,
      input.roomTypeId,
      input.checkInDate,
      input.checkOutDate
    );

    // Validação de Double-Booking se quarto físico for alocado
    if (input.roomId) {
      const room = await prisma.room.findFirst({
        where: { id: input.roomId, hotelId, roomTypeId: input.roomTypeId },
      });
      if (!room) {
        throw new NotFoundError('Quarto físico não encontrado para esta categoria.', input.roomId);
      }
      await this.validatePhysicalRoomAvailability(
        hotelId,
        input.roomId,
        input.checkInDate,
        input.checkOutDate
      );
    }

    return await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          hotelId,
          guestId: guestId!,
          roomTypeId: input.roomTypeId,
          roomId: input.roomId ?? null,
          checkInDate: input.checkInDate,
          checkOutDate: input.checkOutDate,
          numberOfGuests: input.numberOfGuests,
          status: OrderStatus.PENDING,
          source: input.source || OrderSource.MANUAL,
          notes: input.notes ?? null,
        },
        include: {
          guest: true,
          roomType: true,
          room: true,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: OrderStatus.PENDING,
          toStatus: OrderStatus.PENDING,
          changedByEmployeeId: employeeId ?? null,
        },
      });

      return order;
    });
  }


  async importCsvOrders(hotelId: string, items: CsvImportOrderInput, employeeId?: string) {
    const createdOrders = [];

    for (const item of items) {
      const guest = await guestService.findOrCreateGuest(hotelId, {
        name: item.guestName,
        email: item.guestEmail ?? null,
        phone: item.guestPhone ?? null,
      });

      const roomType = await prisma.roomType.findFirst({
        where: { id: item.roomTypeId, hotelId },
      });
      if (!roomType) {
        throw new NotFoundError(`Categoria de quarto com ID '${item.roomTypeId}' não encontrada.`);
      }

      await this.validateCategoryAvailability(
        hotelId,
        item.roomTypeId,
        item.checkInDate,
        item.checkOutDate
      );

      const order = await prisma.$transaction(async (tx) => {
        const created = await tx.order.create({
          data: {
            hotelId,
            guestId: guest.id,
            roomTypeId: item.roomTypeId,
            checkInDate: item.checkInDate,
            checkOutDate: item.checkOutDate,
            numberOfGuests: item.numberOfGuests,
            status: OrderStatus.PENDING,
            source: OrderSource.CSV_IMPORT,
            notes: item.notes ?? null,
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: created.id,
            fromStatus: OrderStatus.PENDING,
            toStatus: OrderStatus.PENDING,
            changedByEmployeeId: employeeId ?? null,
          },
        });

        return created;
      });

      createdOrders.push(order);
    }

    return {
      importedCount: createdOrders.length,
      orders: createdOrders,
    };
  }

  async updateOrderStatus(
    hotelId: string,
    orderId: string,
    input: UpdateOrderStatusInput,
    employeeId?: string
  ) {
    const currentOrder = await this.getOrderById(hotelId, orderId);

    const fromStatus = currentOrder.status;
    const toStatus = input.status;

    // 1. Validação de transição de status válida
    if (fromStatus !== toStatus) {
      const allowed = VALID_ORDER_STATUS_TRANSITIONS[fromStatus] || [];
      if (!allowed.includes(toStatus)) {
        throw new InvalidStatusTransitionError(fromStatus, toStatus);
      }
    }

    let finalRoomId = currentOrder.roomId;
    if (input.roomId !== undefined) {
      if (input.roomId !== null) {
        const room = await prisma.room.findFirst({
          where: { id: input.roomId, hotelId, roomTypeId: currentOrder.roomTypeId },
        });
        if (!room) {
          throw new NotFoundError('Quarto físico não encontrado para esta categoria.', input.roomId);
        }
      }
      finalRoomId = input.roomId;
    }

    // 2. Exigência obrigatória de quarto físico para realizar CHECKED_IN
    if (toStatus === OrderStatus.CHECKED_IN && !finalRoomId) {
      throw new ValidationError('Para realizar o Check-in, é obrigatório associar um quarto físico à reserva.');
    }

    // 3. Prevenção de Double-Booking se um quarto físico for atribuído/mantido na transição
    if (finalRoomId && (toStatus === OrderStatus.CONFIRMED || toStatus === OrderStatus.CHECKED_IN)) {
      await this.validatePhysicalRoomAvailability(
        hotelId,
        finalRoomId,
        currentOrder.checkInDate,
        currentOrder.checkOutDate,
        orderId
      );
    }

    return await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: toStatus,
          roomId: finalRoomId,
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
        },
        include: {
          guest: true,
          roomType: true,
          room: true,
        },
      });

      if (fromStatus !== toStatus) {
        await tx.orderStatusHistory.create({
          data: {
            orderId: updatedOrder.id,
            fromStatus,
            toStatus,
            changedByEmployeeId: employeeId ?? null,
          },
        });
      }

      return updatedOrder;
    });
  }

  async deleteOrder(hotelId: string, id: string) {
    await this.getOrderById(hotelId, id);

    await prisma.order.delete({
      where: { id },
    });

    return { message: 'Pedido de reserva removido com sucesso.' };
  }
}
