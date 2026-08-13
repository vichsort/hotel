import type { Request, Response } from 'express';
import { EmployeeService } from '@/modules/employee/employee.service.js';
import { createEmployeeSchema, updateEmployeeSchema, queryEmployeeSchema } from '@/modules/employee/employee.schema.js';
import { ApiResponse } from '@/shared/utils/apiResponse.js';

const employeeService = new EmployeeService();

export class EmployeeController {
  async list(req: Request, res: Response): Promise<void> {
    const hotelId = req.hotelId!;
    const query = queryEmployeeSchema.parse(req.query);
    const result = await employeeService.listEmployees(hotelId, query);

    res.status(200).json(ApiResponse.success(result.items, { pagination: result.pagination }));
  }

  async getById(req: Request, res: Response): Promise<void> {
    const hotelId = req.hotelId!;
    const id = req.params.id as string;
    const employee = await employeeService.getEmployeeById(hotelId, id);

    res.status(200).json(ApiResponse.success(employee));
  }

  async create(req: Request, res: Response): Promise<void> {
    const hotelId = req.hotelId!;
    const input = createEmployeeSchema.parse(req.body);
    const employee = await employeeService.createEmployee(hotelId, input);

    res.status(201).json(ApiResponse.success(employee));
  }

  async update(req: Request, res: Response): Promise<void> {
    const hotelId = req.hotelId!;
    const id = req.params.id as string;
    const input = updateEmployeeSchema.parse(req.body);
    const employee = await employeeService.updateEmployee(hotelId, id, input);

    res.status(200).json(ApiResponse.success(employee));
  }

  async delete(req: Request, res: Response): Promise<void> {
    const hotelId = req.hotelId!;
    const id = req.params.id as string;
    const currentUserId = req.user?.id;
    const result = await employeeService.deleteEmployee(hotelId, id, currentUserId);

    res.status(200).json(ApiResponse.success(result));
  }
}
