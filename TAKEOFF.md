# Hotel MVP — Contexto Completo do Projeto

> Este documento consolida todas as decisões de produto e arquitetura tomadas até agora. Use-o como prompt/contexto ao explicar o projeto para outra pessoa, ferramenta de IA, ou para retomar o trabalho depois de um tempo parado.

## 1. Visão do produto

MVP de demonstração de um sistema de gestão de pedidos/reservas para **pequenos hotéis**. O objetivo é substituir o controle manual (caderno, planilha) por um sistema digital simples, sem forçar o hotel a mudar radicalmente como já trabalha.

O sistema centraliza pedidos vindos de **três canais diferentes**, todos alimentando o mesmo modelo de dado:

1. **Cadastro manual** — funcionário digita o pedido direto no painel.
2. **Importação de CSV** — hotel exporta um extrato (ex. do extranet do Booking.com) e importa no sistema. Não há integração automática/API com Booking.com no MVP — isso exigiria certificação de parceiro, fora de escopo agora.
3. **Widget de chat** — um chatbot embutido no site do próprio hotel, que coleta os dados do pedido via conversa guiada (com fallback para IA extrair dados de texto livre) e cria o pedido automaticamente. Casos que o bot não consegue resolver ficam marcados para revisão humana.

Um chatbot via WhatsApp Business API foi cogitado, mas adiado — exige CNPJ, verificação da Meta e processo de homologação, o que atrasaria a demo. Fica como evolução futura.

## 2. Stack tecnológica

- **Backend:** Express.js + TypeScript
- **ORM:** Prisma
- **Banco de dados:** PostgreSQL via NeonDB (serverless)
- **Frontend:** Angular + TypeScript
- **Autenticação:** JWT armazenado em cookie `httpOnly`
- **Validação de entrada:** Zod
- **Upload de imagem:** Cloudinary (upload direto do navegador via assinatura, sem passar pelo backend)
- **Repositórios:** dois repositórios separados (`hotel-mvp-api` e `hotel-mvp-web`), sem monorepo.

## 3. Modelo de dados

### Convenções gerais
- Nomes em inglês, seguindo boas práticas.
- Models em PascalCase singular; campos em camelCase; colunas físicas em snake_case via `@map`/`@@map`.
- IDs em UUID (nunca sequencial).
- Todo model editável tem `createdAt`, `updatedAt`, e `deletedAt` (soft delete).
- Todo campo com domínio fechado de valores é um `enum`, nunca string livre.
- Multi-tenancy: banco único, toda tabela relevante carrega `hotelId`; toda query deve ser escopada por hotel.

### Entidades

- **Hotel** — a raiz/tenant. `id, name, timestamps, deletedAt`.
- **Employee** — funcionário do hotel; é o único que autentica (login e senha ficam nele mesmo, sem tabela de credencial separada, pois só ele loga). `id, hotelId, name, email (único por hotel), passwordHash, role (ADMIN | STAFF), timestamps, deletedAt`.
- **Guest** — hóspede, escopado por hotel (decisão consciente: nada de tabela `Person` global unificando Guest/Employee — mantém isolamento entre hotéis, o que ajuda com LGPD). Sem login, sem conta. `id, hotelId, name, email?, phone?, timestamps, deletedAt`.
- **RoomType** — categoria de acomodação (ex. "Standard", "Suíte"). Guarda `images: String[]` (URLs do Cloudinary). Não guarda contagem de quartos (`totalRooms`) — isso é sempre derivado da tabela `Room`, para evitar duas fontes de verdade. `id, hotelId, name, description?, basePrice (Decimal), images[], timestamps, deletedAt`.
- **Room** — quarto físico, pertence a um `RoomType`. `status` guarda **apenas** estado operacional/físico (`AVAILABLE | MAINTENANCE | CLEANING | OUT_OF_SERVICE`) — **nunca** "ocupado/livre". Se está ocupado num dado momento é sempre calculado dinamicamente a partir dos `Order`s ativos que referenciam aquele quarto naquela data, nunca armazenado como coluna fixa (evita dessincronização). `number` é único por hotel. `id, hotelId, roomTypeId, number, floor?, status, timestamps, deletedAt`.
- **Order** — o pedido/reserva, entidade central do sistema. Referencia `roomTypeId` (o que foi reservado) e opcionalmente `roomId` (o quarto físico, geralmente alocado perto do check-in). `id, hotelId, guestId, roomTypeId, roomId?, checkInDate, checkOutDate, numberOfGuests, status (PENDING | CONFIRMED | CHECKED_IN | CHECKED_OUT | CANCELLED), source (MANUAL | CSV_IMPORT | CHAT_WIDGET), notes?, timestamps, deletedAt`.
- **OrderStatusHistory** — log de auditoria imutável (sem soft delete — histórico nunca é apagado). `id, orderId, fromStatus, toStatus, changedAt, changedByEmployeeId?` (nulo quando a mudança foi automática, feita pelo sistema/bot).

O schema Prisma completo já foi gerado e está em `prisma/schema.prisma`.

## 4. Arquitetura do backend

Organização **modular por domínio** (não por camada), cada módulo praticamente autocontido:

```
src/
  modules/
    hotel/  employee/  guest/  room/  room-type/  order/  auth/  chatbot/
      *.routes.ts
      *.controller.ts
      *.service.ts
      *.schema.ts
  shared/
    errors/          # tipos de erro customizados (AppError, auth.errors, domain.errors)
    middlewares/       # auth, tenantScope, rateLimit, error handler
    prisma/            # client único do PrismaClient + extensão de soft delete
    types/              # extensão de tipos do Express (req.hotelId, req.employeeId)
    utils/
  config/
    env.ts, cors.ts
  router/
    index.ts           # monta as rotas de todos os módulos
  app.ts
  server.ts
```

Fluxo de uma requisição autenticada: `Request → Middleware (auth + tenant scope) → Controller (valida com Zod) → Service (regra de negócio + Prisma) → Neon`.

### Autenticação
- JWT gerado no login (`POST /auth/login`), guardado em **cookie httpOnly**.
- Implicações técnicas dessa escolha:
  - CORS precisa de origem específica (nunca `*`) + `credentials: true`.
  - Angular precisa mandar `withCredentials: true` em toda chamada autenticada.
  - Cookie configurado com `sameSite: 'lax'` (mitigação simples de CSRF) e `secure: true` em produção.
  - Rate limit mais agressivo especificamente na rota de login (proteção contra força bruta).

### Módulo do chatbot — particularidade importante
O chatbot **não duplica** a lógica de criação de pedido — ele chama o mesmo `order.service.ts` que os outros canais usam, passando `source: CHAT_WIDGET`. A diferença real é a **porta de entrada**:
- É uma rota **pública** (visitante anônimo no site do hotel, sem login de funcionário).
- Não usa o `auth.middleware.ts` de funcionário — usa uma identificação pública do hotel (ex. `hotelId` ou chave pública embutida no script do widget).
- Precisa de rate limit bem mais agressivo que o resto da API, por ser a única superfície exposta sem autenticação.
- Estado da conversa (perguntas/respostas em andamento) fica **no frontend**, sem tabela nova no banco — só ao final da conversa o widget manda um payload único pro backend.
- Casos que o bot não consegue resolver com confiança: cria o `Order` mesmo assim, com `status: PENDING` e uma nota indicando necessidade de revisão humana, em vez de criar infraestrutura de fila separada.

## 5. Upload de imagem (RoomType)

Fluxo direto do navegador para o Cloudinary, sem passar pelo backend:
1. Frontend pede ao backend uma assinatura de upload temporária.
2. Frontend envia a imagem direto pro Cloudinary usando essa assinatura.
3. Cloudinary retorna a URL da imagem.
4. Frontend envia essa URL pro backend, que salva no array `images` do `RoomType`.

O segredo/API key do Cloudinary nunca sai do backend — só a assinatura (de uso único e restrito) vai pro frontend.

## 6. Decisões conscientemente adiadas (fora do escopo do MVP)

- Integração real via API com Booking.com/Airbnb (exige certificação de parceiro).
- WhatsApp Business API oficial (exige CNPJ, verificação, homologação).
- Controle de disponibilidade/overbooking automático em tempo real.
- Histórico de mudanças de status do `Room` (auditoria de manutenção/limpeza).
- Login/conta para `Guest`.
- Testes automatizados e CI/CD.

## 7. Notas de nomenclatura e organização do repositório

- Pastas/arquivos com mais de uma palavra: **kebab-case** (ex. `room-type`, não `room_type`) — consistente com o guia de estilo do Angular.
- Pastas geradas por ferramentas de IA de desenvolvimento (`.claude/`, `.windsurf/`, `.agents/`, `ANTIGRAVITY.md`, `skills-lock.json`) devem estar no `.gitignore`, a menos que o time decida versionar configurações compartilhadas.