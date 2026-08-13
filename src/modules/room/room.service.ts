import { prisma, basePrisma } from '@/shared/prisma/client.js';
import { ConflictError, NotFoundError } from '@/shared/errors/index.js';
import { OrderStatus, RoomStatus } from '@prisma/client';
import type { CreateRoomInput, UpdateRoomInput, QueryRoomInput } from '@/modules/room/room.schema.js';

export class RoomService {
  async listRooms(hotelId: string, query: QueryRoomInput) {
    const { page, limit, search, roomTypeId, status } = query;
    const skip = (page - 1) * limit;
    const cleanSearch = search?.trim();

    const whereCondition = {
      hotelId,
      ...(roomTypeId ? { roomTypeId } : {}),
      ...(status ? { status } : {}),
      ...(cleanSearch
        ? {
            OR: [
              { number: { contains: cleanSearch, mode: 'insensitive' as const } },
              { floor: { contains: cleanSearch, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.room.count({ where: whereCondition }),
      prisma.room.findMany({
        where: whereCondition,
        include: {
          roomType: {
            select: {
              id: true,
              name: true,
              basePrice: true,
            },
          },
        },
        orderBy: { number: 'asc' },
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

  async getRoomById(hotelId: string, id: string) {
    const room = await prisma.room.findFirst({
      where: { id, hotelId },
      include: {
        roomType: {
          select: {
            id: true,
            name: true,
            basePrice: true,
          },
        },
      },
    });

    if (!room) {
      throw new NotFoundError('Quarto', id);
    }

    return room;
  }

  async createRoom(hotelId: string, input: CreateRoomInput) {
    const { roomTypeId, number, floor, status } = input;

    const roomType = await prisma.roomType.findFirst({
      where: { id: roomTypeId, hotelId },
    });

    if (!roomType) {
      throw new NotFoundError('Categoria de quarto', roomTypeId);
    }

    // Busca incluindo registros em soft delete para reativação automática
    const existingRoom = await basePrisma.room.findFirst({
      where: { hotelId, number },
    });

    if (existingRoom) {
      if (existingRoom.deletedAt === null) {
        throw new ConflictError(`Já existe um quarto cadastrado com o número '${number}' neste hotel.`);
      }

      // Reativação do quarto que havia sido desativado via soft delete
      const reactivatedRoom = await basePrisma.room.update({
        where: { id: existingRoom.id },
        data: {
          roomTypeId,
          floor: floor ?? null,
          status,
          deletedAt: null,
        },
        include: {
          roomType: {
            select: { id: true, name: true, basePrice: true },
          },
        },
      });

      return reactivatedRoom;
    }

    const room = await prisma.room.create({
      data: {
        hotelId,
        roomTypeId,
        number,
        floor: floor ?? null,
        status,
      },
      include: {
        roomType: {
          select: {
            id: true,
            name: true,
            basePrice: true,
          },
        },
      },
    });

    return room;
  }

  async updateRoom(hotelId: string, id: string, input: UpdateRoomInput) {
    const currentRoom = await this.getRoomById(hotelId, id);

    if (input.roomTypeId && input.roomTypeId !== currentRoom.roomTypeId) {
      const roomType = await prisma.roomType.findFirst({
        where: { id: input.roomTypeId, hotelId },
      });

      if (!roomType) {
        throw new NotFoundError('Categoria de quarto', input.roomTypeId);
      }
    }

    if (input.number && input.number !== currentRoom.number) {
      const existingRoom = await prisma.room.findFirst({
        where: {
          hotelId,
          number: input.number,
          id: { not: id },
        },
      });

      if (existingRoom) {
        throw new ConflictError(`Já existe outro quarto com o número '${input.number}' neste hotel.`);
      }
    }

    const updatedRoom = await prisma.room.update({
      where: { id },
      data: {
        ...(input.roomTypeId !== undefined ? { roomTypeId: input.roomTypeId } : {}),
        ...(input.number !== undefined ? { number: input.number } : {}),
        ...(input.floor !== undefined ? { floor: input.floor ?? null } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
      include: {
        roomType: {
          select: {
            id: true,
            name: true,
            basePrice: true,
          },
        },
      },
    });

    return updatedRoom;
  }

  /**
   * Alteração exclusiva do status operacional do quarto (governança / STAFF)
   */
  async updateRoomStatus(hotelId: string, id: string, status: RoomStatus) {
    await this.getRoomById(hotelId, id);

    const updatedRoom = await prisma.room.update({
      where: { id },
      data: { status },
      include: {
        roomType: {
          select: { id: true, name: true, basePrice: true },
        },
      },
    });

    return updatedRoom;
  }

  async deleteRoom(hotelId: string, id: string) {
    const room = await this.getRoomById(hotelId, id);

    // Trava de exclusão: bloqueia exclusão de quartos com reservas confirmadas ou hospedagens ativas
    const activeOrdersCount = await prisma.order.count({
      where: {
        hotelId,
        roomId: id,
        status: { in: [OrderStatus.CONFIRMED, OrderStatus.CHECKED_IN] },
      },
    });

    if (activeOrdersCount > 0) {
      throw new ConflictError(
        `Não é possível remover o quarto '${room.number}' pois existem ${activeOrdersCount} reserva(s) confirmada(s) ou hospedagem(ns) ativa(s) vinculada(s) a ele.`
      );
    }

    await prisma.room.delete({
      where: { id },
    });

    return { message: 'Quarto removido com sucesso.' };
  }
}
