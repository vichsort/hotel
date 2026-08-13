import type { Request, Response } from 'express';
import { OrderService } from '@/modules/order/order.service.js';
import {
  createOrderSchema,
  csvImportOrderSchema,
  updateOrderStatusSchema,
  queryOrderSchema,
} from '@/modules/order/order.schema.js';
import { ApiResponse } from '@/shared/utils/apiResponse.js';

const orderService = new OrderService();

export class OrderController {
  async list(req: Request, res: Response): Promise<void> {
    const hotelId = req.hotelId!;
    const query = queryOrderSchema.parse(req.query);
    const result = await orderService.listOrders(hotelId, query);

    res.status(200).json(ApiResponse.success(result.items, { pagination: result.pagination }));
  }

  async getById(req: Request, res: Response): Promise<void> {
    const hotelId = req.hotelId!;
    const id = req.params.id as string;
    const order = await orderService.getOrderById(hotelId, id);

    res.status(200).json(ApiResponse.success(order));
  }

  async createManual(req: Request, res: Response): Promise<void> {
    const hotelId = req.hotelId!;
    const employeeId = req.user?.id;
    const input = createOrderSchema.parse(req.body);
    const order = await orderService.createManualOrder(hotelId, input, employeeId);

    res.status(201).json(ApiResponse.success(order));
  }

  async importCsv(req: Request, res: Response): Promise<void> {
    const hotelId = req.hotelId!;
    const employeeId = req.user?.id;
    const items = csvImportOrderSchema.parse(req.body);
    const result = await orderService.importCsvOrders(hotelId, items, employeeId);

    res.status(201).json(ApiResponse.success(result));
  }

  async updateStatus(req: Request, res: Response): Promise<void> {
    const hotelId = req.hotelId!;
    const id = req.params.id as string;
    const employeeId = req.user?.id;
    const input = updateOrderStatusSchema.parse(req.body);
    const updatedOrder = await orderService.updateOrderStatus(hotelId, id, input, employeeId);

    res.status(200).json(ApiResponse.success(updatedOrder));
  }

  async delete(req: Request, res: Response): Promise<void> {
    const hotelId = req.hotelId!;
    const id = req.params.id as string;
    const result = await orderService.deleteOrder(hotelId, id);

    res.status(200).json(ApiResponse.success(result));
  }
}
