import { describe, it, expect } from 'vitest';
import { HealthService } from '@/modules/health/health.service.js';

describe('HealthService', () => {
  it('deve instanciar o HealthService corretamente', () => {
    const service = new HealthService();
    expect(service).toBeDefined();
  });
});
