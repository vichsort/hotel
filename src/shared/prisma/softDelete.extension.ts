import { Prisma } from '@prisma/client';

const SOFT_DELETE_MODELS = new Set([
  'Hotel',
  'Employee',
  'Guest',
  'RoomType',
  'Room',
  'Order',
]);

export const softDeleteExtension = Prisma.defineExtension({
  name: 'softDelete',
  query: {
    $allModels: {
      async findUnique({ model, args, query }: { model: string; args: any; query: (args: any) => Promise<any> }) {
        if (!SOFT_DELETE_MODELS.has(model)) return query(args);
        return query({
          ...args,
          where: {
            ...args.where,
            deletedAt: null,
          },
        });
      },
      async findFirst({ model, args, query }: { model: string; args: any; query: (args: any) => Promise<any> }) {
        if (!SOFT_DELETE_MODELS.has(model)) return query(args);
        return query({
          ...args,
          where: {
            ...args.where,
            deletedAt: null,
          },
        });
      },
      async findMany({ model, args, query }: { model: string; args: any; query: (args: any) => Promise<any> }) {
        if (!SOFT_DELETE_MODELS.has(model)) return query(args);
        return query({
          ...args,
          where: {
            ...args.where,
            deletedAt: null,
          },
        });
      },
      async count({ model, args, query }: { model: string; args: any; query: (args: any) => Promise<any> }) {
        if (!SOFT_DELETE_MODELS.has(model)) return query(args);
        return query({
          ...args,
          where: {
            ...(args.where || {}),
            deletedAt: null,
          },
        });
      },
      async delete({ model, args }: { model: string; args: any }) {
        if (!SOFT_DELETE_MODELS.has(model)) {
          return (Prisma.getExtensionContext(this) as any)[model].delete({ where: args.where });
        }
        return (Prisma.getExtensionContext(this) as any)[model].update({
          where: args.where,
          data: {
            deletedAt: new Date(),
          },
        });
      },
      async deleteMany({ model, args }: { model: string; args: any }) {
        if (!SOFT_DELETE_MODELS.has(model)) {
          return (Prisma.getExtensionContext(this) as any)[model].deleteMany({ where: args.where });
        }
        return (Prisma.getExtensionContext(this) as any)[model].updateMany({
          where: {
            ...(args.where || {}),
            deletedAt: null,
          },
          data: {
            deletedAt: new Date(),
          },
        });
      },
    },
  },
});
