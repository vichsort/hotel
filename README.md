# Hotel MVP — API

MVP de um sistema de gestão de pedidos/reservas para pequenos hotéis. Centraliza em um único lugar o que hoje é feito manualmente (caderno, planilha), permitindo múltiplos canais de entrada de pedidos: cadastro manual, importação de CSV e um widget de chat no site.

## Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Express
- **ORM:** Prisma
- **Banco de dados:** PostgreSQL (Neon)
- **Autenticação:** JWT em cookie httpOnly
- **Validação:** Zod

## Pré-requisitos

- Node.js 20+
- Uma instância de banco PostgreSQL (recomendado: [Neon](https://neon.tech), tem tier gratuito)

## Setup

1. Clone o repositório e instale as dependências:

   ```bash
   npm install
   ```

2. Copie o arquivo de variáveis de ambiente de exemplo e preencha com seus dados:

   ```bash
   cp .env.example .env
   ```

   Variáveis necessárias:

   | Variável       | Descrição                                      |
   | -------------- | ----------------------------------------------- |
   | `DATABASE_URL` | String de conexão do Postgres (Neon)             |
   | `JWT_SECRET`   | Segredo usado para assinar os tokens de sessão   |
   | `PORT`         | Porta em que a API vai rodar (padrão: `3000`)    |

3. Rode as migrações do Prisma contra o banco:

   ```bash
   npx prisma migrate dev
   ```

4. Suba o servidor em modo desenvolvimento:

   ```bash
   npm run dev
   ```

## Estrutura do projeto

```
src/
  modules/       # um módulo por domínio (hotel, employee, guest, order, room, room-type, auth)
    <modulo>/
      *.routes.ts
      *.controller.ts
      *.service.ts
      *.schema.ts     # validação de entrada (zod)
  shared/
    errors/           # tipos de erro customizados
    middlewares/       # auth, escopo de tenant, rate limit, tratamento de erro
    prisma/            # instância única do PrismaClient + extensão de soft delete
    utils/
  config/
    env.ts             # validação das variáveis de ambiente
  router/
    index.ts           # monta as rotas de todos os módulos
  app.ts               # configuração do Express (middlewares globais, rotas)
  server.ts             # sobe o servidor HTTP
prisma/
  schema.prisma
```

## Convenções do projeto

- **Multi-tenancy:** todo dado relevante carrega um `hotelId`. Toda query deve ser escopada por hotel — reforçado pelo middleware de escopo de tenant.
- **Soft delete:** entidades editáveis pelo usuário (`Hotel`, `Employee`, `Guest`, `RoomType`, `Room`, `Order`) usam `deletedAt` (nullable) em vez de exclusão física. `OrderStatusHistory` é log imutável e nunca é deletado.
- **Nomenclatura:** tudo em inglês. Models em PascalCase singular, campos em camelCase, colunas físicas em snake_case (via `@map`/`@@map` no Prisma). Pastas e arquivos com mais de uma palavra usam kebab-case.
- **Enums** para todo campo com domínio fechado de valores (status, papéis, canal de origem) — nunca strings livres.

## Scripts

| Comando               | Descrição                                  |
| --------------------- | -------------------------------------------- |
| `npm run dev`          | Sobe o servidor em modo desenvolvimento      |
| `npm run build`        | Compila o TypeScript para `dist/`            |
| `npm start`            | Roda a versão compilada (produção)           |
| `npx prisma studio`    | Abre uma interface visual para o banco de dados |
| `npx prisma migrate dev` | Cria e aplica uma nova migração             |

## Status

Projeto em fase de MVP/demonstração. Ainda não possui testes automatizados nem CI/CD configurado.