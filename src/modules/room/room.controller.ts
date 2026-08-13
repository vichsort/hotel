import type { Request, Response } from 'express';
import { RoomService } from '@/modules/room/room.service.js';
import { createRoomSchema, updateRoomSchema, updateRoomStatusSchema, queryRoomSchema } from '@/modules/room/room.schema.js';
import { ApiResponse } from '@/shared/utils/apiResponse.js';

const roomService = new RoomService();

export class RoomController {
  async list(req: Request, res: Response): Promise<void> {
    const hotelId = req.hotelId!;
    const query = queryRoomSchema.parse(req.query);
    const result = await roomService.listRooms(hotelId, query);

    res.status(200).json(ApiResponse.success(result.items, { pagination: result.pagination }));
  }

  async getById(req: Request, res: Response): Promise<void> {
    const hotelId = req.hotelId!;
    const id = req.params.id as string;
    const room = await roomService.getRoomById(hotelId, id);

    res.status(200).json(ApiResponse.success(room));
  }

  async create(req: Request, res: Response): Promise<void> {
    const hotelId = req.hotelId!;
    const input = createRoomSchema.parse(req.body);
    const room = await roomService.createRoom(hotelId, input);

    res.status(201).json(ApiResponse.success(room));
  }

  async update(req: Request, res: Response): Promise<void> {
    const hotelId = req.hotelId!;
    const id = req.params.id as string;
    const input = updateRoomSchema.parse(req.body);
    const room = await roomService.updateRoom(hotelId, id, input);

    res.status(200).json(ApiResponse.success(room));
  }

  async updateStatus(req: Request, res: Response): Promise<void> {
    const hotelId = req.hotelId!;
    const id = req.params.id as string;
    const { status } = updateRoomStatusSchema.parse(req.body);
    const room = await roomService.updateRoomStatus(hotelId, id, status);

    res.status(200).json(ApiResponse.success(room));
  }

  async delete(req: Request, res: Response): Promise<void> {
    const hotelId = req.hotelId!;
    const id = req.params.id as string;
    const result = await roomService.deleteRoom(hotelId, id);

    res.status(200).json(ApiResponse.success(result));
  }
}
