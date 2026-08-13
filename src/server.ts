import { createApp } from '@/app.js';
import { env } from '@/config/env.js';
import { setupGracefulShutdown } from '@/bootstrap/shutdown.js';

function startServer(): void {
  const app = createApp();

  const server = app.listen(env.PORT, () => {
    console.log(`\n🚀 [Hotel MVP API] Servidor iniciado com sucesso!`);
    console.log(`📡 Porta: ${env.PORT}`);
    console.log(`🌐 Ambiente: ${env.NODE_ENV}`);
    console.log(`🏥 Healthcheck: http://localhost:${env.PORT}/health\n`);
  });

  setupGracefulShutdown(server);
}

startServer();
