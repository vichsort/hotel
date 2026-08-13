import type { Request, Response } from 'express';
import { GuestService } from '@/modules/guest/guest.service.js';
import { createGuestSchema, updateGuestSchema, queryGuestSchema } from '@/modules/guest/guest.schema.js';
import { ApiResponse } from '@/shared/utils/apiResponse.js';

const guestService = new GuestService();

export class GuestController {
  async list(req: Request, res: Response): Promise<void> {
    const hotelId = req.hotelId!;
    const query = queryGuestSchema.parse(req.query);
    const result = await guestService.listGuests(hotelId, query);

    res.status(200).json(ApiResponse.success(result.items, { pagination: result.pagination }));
  }

  async getById(req: Request, res: Response): Promise<void> {
    const hotelId = req.hotelId!;
    const id = req.params.id as string;
    const guest = await guestService.getGuestById(hotelId, id);

    res.status(200).json(ApiResponse.success(guest));
  }

  async create(req: Request, res: Response): Promise<void> {
    const hotelId = req.hotelId!;
    const input = createGuestSchema.parse(req.body);
    const guest = await guestService.createGuest(hotelId, input);

    res.status(201).json(ApiResponse.success(guest));
  }

  async update(req: Request, res: Response): Promise<void> {
    const hotelId = req.hotelId!;
    const id = req.params.id as string;
    const input = updateGuestSchema.parse(req.body);
    const guest = await guestService.updateGuest(hotelId, id, input);

    res.status(200).json(ApiResponse.success(guest));
  }

  async delete(req: Request, res: Response): Promise<void> {
    const hotelId = req.hotelId!;
    const id = req.params.id as string;
    const result = await guestService.deleteGuest(hotelId, id);

    res.status(200).json(ApiResponse.success(result));
  }
}
