import type { Request, Response } from 'express';
import { ChatWidgetService } from '@/modules/chat-widget/chatWidget.service.js';
import { chatWidgetOrderSchema } from '@/modules/chat-widget/chatWidget.schema.js';
import { ApiResponse } from '@/shared/utils/apiResponse.js';

const chatWidgetService = new ChatWidgetService();

export class ChatWidgetController {
  async listRoomTypes(req: Request, res: Response): Promise<void> {
    const hotelId = req.hotelId!;
    const roomTypes = await chatWidgetService.listPublicRoomTypes(hotelId);

    res.status(200).json(ApiResponse.success(roomTypes));
  }

  async createOrder(req: Request, res: Response): Promise<void> {
    const hotelId = req.hotelId!;
    const input = chatWidgetOrderSchema.parse(req.body);
    const order = await chatWidgetService.createChatWidgetOrder(hotelId, input);

    res.status(201).json(ApiResponse.success(order));
  }
}
