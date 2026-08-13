import { basePrisma } from '@/shared/prisma/client.js';
import { env } from '@/config/env.js';

export interface HealthCheckResult {
  status: 'ok' | 'degraded' | 'unhealthy';
  environment: string;
  timestamp: string;
  uptimeSeconds: number;
  checks: {
    database: {
      status: 'up' | 'down';
      responseTimeMs?: number;
      error?: string;
    };
    memory: {
      heapUsedMb: number;
      heapTotalMb: number;
      rssMb: number;
    };
  };
}

export class HealthService {
  /**
   * Executa o ping no banco de dados com limite de tempo estrito (2000ms) usando Promise.race
   */
  private async pingDatabaseWithTimeout(timeoutMs: number = 2000): Promise<void> {
    const pingPromise = basePrisma.$queryRaw`SELECT 1`;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout de conexão com o banco de dados (${timeoutMs}ms)`)), timeoutMs)
    );

    await Promise.race([pingPromise, timeoutPromise]);
  }

  /**
   * Checagem de prontidão (Readiness Probe)
   */
  async checkReadiness(): Promise<{ status: 'up' | 'down'; responseTimeMs?: number; error?: string }> {
    const startTime = Date.now();
    try {
      await this.pingDatabaseWithTimeout(2000);
      return {
        status: 'up',
        responseTimeMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        status: 'down',
        error: err?.message || 'Erro de conexão com o banco de dados',
      };
    }
  }

  /**
   * Diagnóstico completo de integridade (Health Check Report)
   */
  async checkHealth(): Promise<HealthCheckResult> {
    const memory = process.memoryUsage();
    const dbCheck = await this.checkReadiness();

    const isHealthy = dbCheck.status === 'up';
    const status: 'ok' | 'degraded' | 'unhealthy' = isHealthy ? 'ok' : 'unhealthy';

    return {
      status,
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      checks: {
        database: dbCheck,
        memory: {
          heapUsedMb: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
          heapTotalMb: Math.round((memory.heapTotal / 1024 / 1024) * 100) / 100,
          rssMb: Math.round((memory.rss / 1024 / 1024) * 100) / 100,
        },
      },
    };
  }
}
