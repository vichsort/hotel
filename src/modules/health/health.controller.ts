import type { Request, Response } from 'express';
import { HealthService } from '@/modules/health/health.service.js';
import { ApiResponse } from '@/shared/utils/apiResponse.js';

const healthService = new HealthService();

export class HealthController {
  async getHealth(_req: Request, res: Response): Promise<void> {
    const result = await healthService.checkHealth();
    const httpStatus = result.status === 'ok' ? 200 : 503;

    res.status(httpStatus).json(ApiResponse.success(result));
  }

  async getLiveness(_req: Request, res: Response): Promise<void> {
    res.status(200).json(
      ApiResponse.success({
        status: 'ok',
        uptimeSeconds: Math.floor(process.uptime()),
      })
    );
  }

  async getReadiness(_req: Request, res: Response): Promise<void> {
    const dbCheck = await healthService.checkReadiness();
    const httpStatus = dbCheck.status === 'up' ? 200 : 503;

    res.status(httpStatus).json(
      ApiResponse.success({
        status: dbCheck.status === 'up' ? 'ok' : 'unhealthy',
        database: dbCheck,
      })
    );
  }
}
