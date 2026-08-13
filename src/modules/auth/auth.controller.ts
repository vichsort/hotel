import type { Request, Response } from 'express';
import { AuthService } from '@/modules/auth/auth.service.js';
import { registerHotelSchema, loginSchema } from '@/modules/auth/auth.schema.js';
import { ApiResponse } from '@/shared/utils/apiResponse.js';
import { AUTH_COOKIE_NAME, getAuthCookieOptions } from '@/config/constants.js';

const authService = new AuthService();

export class AuthController {
  async registerHotel(req: Request, res: Response): Promise<void> {
    const input = registerHotelSchema.parse(req.body);
    const result = await authService.registerHotel(input);

    res.cookie(AUTH_COOKIE_NAME, result.token, getAuthCookieOptions());

    res.status(201).json(ApiResponse.success(result));
  }

  async login(req: Request, res: Response): Promise<void> {
    const input = loginSchema.parse(req.body);
    const result = await authService.login(input);

    res.cookie(AUTH_COOKIE_NAME, result.token, getAuthCookieOptions());

    res.status(200).json(ApiResponse.success(result));
  }

  async logout(_req: Request, res: Response): Promise<void> {
    res.clearCookie(AUTH_COOKIE_NAME, getAuthCookieOptions());
    res.status(200).json(ApiResponse.success({ message: 'Logout realizado com sucesso.' }));
  }

  async me(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const profile = await authService.getProfile(userId);

    res.status(200).json(ApiResponse.success(profile));
  }
}
