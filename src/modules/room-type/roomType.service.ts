import { prisma } from '@/shared/prisma/client.js';
import { NotFoundError, ConflictError } from '@/shared/errors/index.js';
import type { CreateRoomTypeInput, UpdateRoomTypeInput, QueryRoomTypeInput } from '@/modules/room-type/roomType.schema.js';

export class RoomTypeService {
  async listRoomTypes(hotelId: string, query: QueryRoomTypeInput) {
    const { page, limit, search } = query;
    const skip = (page - 1) * limit;
    const cleanSearch = search?.trim();

    const whereCondition = {
      hotelId,
      ...(cleanSearch
        ? {
            OR: [
              { name: { contains: cleanSearch, mode: 'insensitive' as const } },
              { description: { contains: cleanSearch, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.roomType.count({ where: whereCondition }),
      prisma.roomType.findMany({
        where: whereCondition,
        include: {
          _count: {
            select: { rooms: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const formattedItems = items.map((item) => {
      const { _count, ...rest } = item;
      return {
        ...rest,
        totalRooms: _count.rooms,
      };
    });

    return {
      items: formattedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getRoomTypeById(hotelId: string, id: string) {
    const roomType = await prisma.roomType.findFirst({
      where: { id, hotelId },
      include: {
        _count: {
          select: { rooms: true },
        },
      },
    });

    if (!roomType) {
      throw new NotFoundError('Categoria de quarto', id);
    }

    const { _count, ...rest } = roomType;

    return {
      ...rest,
      totalRooms: _count.rooms,
    };
  }

  async createRoomType(hotelId: string, input: CreateRoomTypeInput) {
    const { name, description, basePrice, images } = input;

    const roomType = await prisma.roomType.create({
      data: {
        hotelId,
        name,
        description: description ?? null,
        basePrice,
        images,
      },
    });

    return {
      ...roomType,
      totalRooms: 0,
    };
  }

  async updateRoomType(hotelId: string, id: string, input: UpdateRoomTypeInput) {
    await this.getRoomTypeById(hotelId, id);

    const updatedRoomType = await prisma.roomType.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description ?? null } : {}),
        ...(input.basePrice !== undefined ? { basePrice: input.basePrice } : {}),
        ...(input.images !== undefined ? { images: input.images } : {}),
      },
      include: {
        _count: {
          select: { rooms: true },
        },
      },
    });

    const { _count, ...rest } = updatedRoomType;

    return {
      ...rest,
      totalRooms: _count.rooms,
    };
  }

  async deleteRoomType(hotelId: string, id: string) {
    const roomType = await this.getRoomTypeById(hotelId, id);

    // Trava de exclusão: impede remover categorias com quartos cadastrados
    if (roomType.totalRooms > 0) {
      throw new ConflictError(
        `Não é possível remover a categoria '${roomType.name}' pois existem ${roomType.totalRooms} quarto(s) vinculado(s) a ela.`
      );
    }

    await prisma.roomType.delete({
      where: { id },
    });

    return { message: 'Categoria de quarto removida com sucesso.' };
  }
}
