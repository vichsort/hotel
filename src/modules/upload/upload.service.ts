import { cloudinary } from '@/config/cloudinary.js';
import { env } from '@/config/env.js';
import { ValidationError } from '@/shared/errors/index.js';

export class UploadService {
  /**
   * Gera a assinatura temporária criptográfica para o frontend realizar upload direto no Cloudinary
   */
  generateUploadSignature(folder: string = 'room-types') {
    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
      throw new ValidationError(
        'As credenciais do Cloudinary (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) não estão configuradas no arquivo .env.'
      );
    }

    const timestamp = Math.round(new Date().getTime() / 1000);

    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp,
        folder,
      },
      env.CLOUDINARY_API_SECRET
    );

    return {
      signature,
      timestamp,
      cloudName: env.CLOUDINARY_CLOUD_NAME,
      apiKey: env.CLOUDINARY_API_KEY,
      folder,
      uploadUrl: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,
    };
  }
}
