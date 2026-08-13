import { prisma } from '@/shared/prisma/client.js';
import { NotFoundError } from '@/shared/errors/index.js';
import { RoomStatus, OrderStatus } from '@prisma/client';
import type { UpdateHotelInput } from '@/modules/hotel/hotel.schema.js';

export class HotelService {
  /**
   * Retorna os dados do perfil do hotel atual e os totais agregados das entidades vinculadas
   */
  async getHotelProfile(hotelId: string) {
    const hotel = await prisma.hotel.findFirst({
      where: { id: hotelId },
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

    if (!hotel) {
      throw new NotFoundError('Hotel', hotelId);
    }

    const { _count, ...rest } = hotel;

    return {
      ...rest,
      summary: {
        totalEmployees: _count.employees,
        totalRoomTypes: _count.roomTypes,
        totalRooms: _count.rooms,
        totalGuests: _count.guests,
        totalOrders: _count.orders,
      },
    };
  }

  /**
   * Atualiza as informações institucionais do hotel
   */
  async updateHotel(hotelId: string, input: UpdateHotelInput) {
    await this.getHotelProfile(hotelId);

    const updatedHotel = await prisma.hotel.update({
      where: { id: hotelId },
      data: {
        name: input.name,
      },
    });

    return updatedHotel;
  }

  /**
   * Métrica consolidada de ocupação e estatísticas para o painel do hotel
   */
  async getHotelStats(hotelId: string) {
    const [
      totalRooms,
      availableRooms,
      maintenanceRooms,
      cleaningRooms,
      outOfServiceRooms,
      pendingOrders,
      confirmedOrders,
      checkedInOrders,
      totalGuests,
    ] = await Promise.all([
      prisma.room.count({ where: { hotelId } }),
      prisma.room.count({ where: { hotelId, status: RoomStatus.AVAILABLE } }),
      prisma.room.count({ where: { hotelId, status: RoomStatus.MAINTENANCE } }),
      prisma.room.count({ where: { hotelId, status: RoomStatus.CLEANING } }),
      prisma.room.count({ where: { hotelId, status: RoomStatus.OUT_OF_SERVICE } }),
      prisma.order.count({ where: { hotelId, status: OrderStatus.PENDING } }),
      prisma.order.count({ where: { hotelId, status: OrderStatus.CONFIRMED } }),
      prisma.order.count({ where: { hotelId, status: OrderStatus.CHECKED_IN } }),
      prisma.guest.count({ where: { hotelId } }),
    ]);

    const occupancyRate = totalRooms > 0 ? Math.round((checkedInOrders / totalRooms) * 100) : 0;

    return {
      occupancyRate,
      rooms: {
        total: totalRooms,
        available: availableRooms,
        maintenance: maintenanceRooms,
        cleaning: cleaningRooms,
        outOfService: outOfServiceRooms,
      },
      orders: {
        pending: pendingOrders,
        confirmed: confirmedOrders,
        checkedIn: checkedInOrders,
        activeTotal: pendingOrders + confirmedOrders + checkedInOrders,
      },
      guests: {
        total: totalGuests,
      },
    };
  }
}
