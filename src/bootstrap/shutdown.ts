import type { Server } from 'node:http';
import { basePrisma } from '@/shared/prisma/client.js';

export function setupGracefulShutdown(server: Server): void {
  const shutdown = async (signal: string) => {
    console.log(`\n[Shutdown] Recebido sinal ${signal}. Encerrando aplicação...`);

    server.close(async (err) => {
      if (err) {
        console.error('[Shutdown] Erro ao fechar servidor HTTP:', err);
        process.exit(1);
      }
      console.log('[Shutdown] Servidor HTTP encerrado com sucesso.');

      try {
        await basePrisma.$disconnect();
        console.log('[Shutdown] Conexão com o banco de dados (Prisma) encerrada.');
        process.exit(0);
      } catch (prismaErr) {
        console.error('[Shutdown] Erro ao desconectar do Prisma:', prismaErr);
        process.exit(1);
      }
    });

    setTimeout(() => {
      console.error('[Shutdown] Tempo limite de encerramento atingido. Forçando encerramento.');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}
