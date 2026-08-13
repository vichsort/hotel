import type { Request, Response } from 'express';
import { RoomTypeService } from '@/modules/room-type/roomType.service.js';
import { createRoomTypeSchema, updateRoomTypeSchema, queryRoomTypeSchema } from '@/modules/room-type/roomType.schema.js';
import { ApiResponse } from '@/shared/utils/apiResponse.js';

const roomTypeService = new RoomTypeService();

export class RoomTypeController {
  async list(req: Request, res: Response): Promise<void> {
    const hotelId = req.hotelId!;
    const query = queryRoomTypeSchema.parse(req.query);
    const result = await roomTypeService.listRoomTypes(hotelId, query);

    res.status(200).json(ApiResponse.success(result.items, { pagination: result.pagination }));
  }

  async getById(req: Request, res: Response): Promise<void> {
    const hotelId = req.hotelId!;
    const id = req.params.id as string;
    const roomType = await roomTypeService.getRoomTypeById(hotelId, id);

    res.status(200).json(ApiResponse.success(roomType));
  }

  async create(req: Request, res: Response): Promise<void> {
    const hotelId = req.hotelId!;
    const input = createRoomTypeSchema.parse(req.body);
    const roomType = await roomTypeService.createRoomType(hotelId, input);

    res.status(201).json(ApiResponse.success(roomType));
  }

  async update(req: Request, res: Response): Promise<void> {
    const hotelId = req.hotelId!;
    const id = req.params.id as string;
    const input = updateRoomTypeSchema.parse(req.body);
    const roomType = await roomTypeService.updateRoomType(hotelId, id, input);

    res.status(200).json(ApiResponse.success(roomType));
  }

  async delete(req: Request, res: Response): Promise<void> {
    const hotelId = req.hotelId!;
    const id = req.params.id as string;
    const result = await roomTypeService.deleteRoomType(hotelId, id);

    res.status(200).json(ApiResponse.success(result));
  }
}
