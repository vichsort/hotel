import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UploadService } from '@/modules/upload/upload.service.js';
import { env } from '@/config/env.js';
import { cloudinary } from '@/config/cloudinary.js';
import { ValidationError } from '@/shared/errors/index.js';

vi.mock('@/config/cloudinary.js', () => ({
  cloudinary: {
    utils: {
      api_sign_request: vi.fn(),
    },
  },
}));

describe('UploadService', () => {
  let uploadService: UploadService;

  beforeEach(() => {
    uploadService = new UploadService();
    vi.clearAllMocks();
  });

  it('deve gerar assinatura e parâmetros de upload com sucesso quando credenciais do Cloudinary existirem', () => {
    env.CLOUDINARY_CLOUD_NAME = 'test_cloud';
    env.CLOUDINARY_API_KEY = '123456';
    env.CLOUDINARY_API_SECRET = 'secret_789';

    vi.mocked(cloudinary.utils.api_sign_request).mockReturnValue('signed_hash_123');

    const result = uploadService.generateUploadSignature('rooms');

    expect(result.signature).toBe('signed_hash_123');
    expect(result.cloudName).toBe('test_cloud');
    expect(result.apiKey).toBe('123456');
    expect(result.folder).toBe('rooms');
    expect(result.uploadUrl).toBe('https://api.cloudinary.com/v1_1/test_cloud/image/upload');
    expect(result).toHaveProperty('timestamp');
  });

  it('deve lançar ValidationError se alguma credencial do Cloudinary estiver ausente', () => {
    env.CLOUDINARY_CLOUD_NAME = undefined;

    expect(() => uploadService.generateUploadSignature()).toThrow(ValidationError);
  });
});
