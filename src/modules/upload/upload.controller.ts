import type { Request, Response } from 'express';
import { UploadService } from '@/modules/upload/upload.service.js';
import { ApiResponse } from '@/shared/utils/apiResponse.js';

const uploadService = new UploadService();

export class UploadController {
  async getSignature(req: Request, res: Response): Promise<void> {
    const folder = (req.query.folder as string) || 'room-types';
    const signatureData = uploadService.generateUploadSignature(folder);

    res.status(200).json(ApiResponse.success(signatureData));
  }
}
