import type { Request, Response } from 'express';
import { HotelService } from '@/modules/hotel/hotel.service.js';
import { updateHotelSchema } from '@/modules/hotel/hotel.schema.js';
import { ApiResponse } from '@/shared/utils/apiResponse.js';

const hotelService = new HotelService();

export class HotelController {
  async getProfile(req: Request, res: Response): Promise<void> {
    const hotelId = req.hotelId!;
    const profile = await hotelService.getHotelProfile(hotelId);

    res.status(200).json(ApiResponse.success(profile));
  }

  async update(req: Request, res: Response): Promise<void> {
    const hotelId = req.hotelId!;
    const input = updateHotelSchema.parse(req.body);
    const updatedHotel = await hotelService.updateHotel(hotelId, input);

    res.status(200).json(ApiResponse.success(updatedHotel));
  }

  async getStats(req: Request, res: Response): Promise<void> {
    const hotelId = req.hotelId!;
    const stats = await hotelService.getHotelStats(hotelId);

    res.status(200).json(ApiResponse.success(stats));
  }
}
