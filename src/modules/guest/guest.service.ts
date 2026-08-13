import { prisma, basePrisma } from '@/shared/prisma/client.js';
import { NotFoundError } from '@/shared/errors/index.js';
import type { CreateGuestInput, UpdateGuestInput, QueryGuestInput } from '@/modules/guest/guest.schema.js';

export class GuestService {
  async listGuests(hotelId: string, query: QueryGuestInput) {
    const { page, limit, search } = query;
    const skip = (page - 1) * limit;
    const cleanSearch = search?.trim();

    const whereCondition = {
      hotelId,
      ...(cleanSearch
        ? {
            OR: [
              { name: { contains: cleanSearch, mode: 'insensitive' as const } },
              { email: { contains: cleanSearch, mode: 'insensitive' as const } },
              { phone: { contains: cleanSearch, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.guest.count({ where: whereCondition }),
      prisma.guest.findMany({
        where: whereCondition,
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

  async getGuestById(hotelId: string, id: string) {
    const guest = await prisma.guest.findFirst({
      where: { id, hotelId },
      include: {
        orders: {
          select: {
            id: true,
            checkInDate: true,
            checkOutDate: true,
            status: true,
            numberOfGuests: true,
            roomType: { select: { id: true, name: true } },
            room: { select: { id: true, number: true } },
          },
          orderBy: { checkInDate: 'desc' },
        },
      },
    });

    if (!guest) {
      throw new NotFoundError('Hóspede', id);
    }

    return guest;
  }

  async createGuest(hotelId: string, input: CreateGuestInput) {
    const { name, email, phone } = input;
    const cleanEmail = email ? email.toLowerCase() : null;

    const guest = await prisma.guest.create({
      data: {
        hotelId,
        name,
        email: cleanEmail,
        phone: phone ?? null,
      },
    });

    return guest;
  }

  async findOrCreateGuest(hotelId: string, data: { name: string; email?: string | null; phone?: string | null }) {
    const cleanEmail = data.email ? data.email.toLowerCase() : null;
    const cleanPhone = data.phone ? data.phone.trim() : null;

    // Busca incluindo registros desativados por soft delete via basePrisma
    let existingGuest = null;

    if (cleanEmail) {
      existingGuest = await basePrisma.guest.findFirst({
        where: { hotelId, email: cleanEmail },
      });
    }

    if (!existingGuest && cleanPhone) {
      existingGuest = await basePrisma.guest.findFirst({
        where: { hotelId, phone: cleanPhone },
      });
    }

    if (existingGuest) {
      // Se estava deletado, reativa a conta e atualiza os dados mais recentes
      if (existingGuest.deletedAt !== null) {
        const reactivated = await basePrisma.guest.update({
          where: { id: existingGuest.id },
          data: {
            name: data.name,
            phone: cleanPhone || existingGuest.phone,
            deletedAt: null,
          },
        });
        return reactivated;
      }

      return existingGuest;
    }

    return this.createGuest(hotelId, {
      name: data.name,
      email: cleanEmail,
      phone: cleanPhone,
    });
  }

  async updateGuest(hotelId: string, id: string, input: UpdateGuestInput) {
    await this.getGuestById(hotelId, id);

    const updatedGuest = await prisma.guest.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.email !== undefined ? { email: input.email ? input.email.toLowerCase() : null } : {}),
        ...(input.phone !== undefined ? { phone: input.phone ?? null } : {}),
      },
    });

    return updatedGuest;
  }

  async deleteGuest(hotelId: string, id: string) {
    await this.getGuestById(hotelId, id);

    await prisma.guest.delete({
      where: { id },
    });

    return { message: 'Hóspede removido com sucesso.' };
  }
}
