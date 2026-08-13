import bcrypt from 'bcrypt';
import { prisma, basePrisma } from '@/shared/prisma/client.js';
import { EmailAlreadyInUseError, NotFoundError, ForbiddenError } from '@/shared/errors/index.js';
import { EmployeeRole } from '@prisma/client';
import type { CreateEmployeeInput, UpdateEmployeeInput, QueryEmployeeInput } from '@/modules/employee/employee.schema.js';

export class EmployeeService {
  async listEmployees(hotelId: string, query: QueryEmployeeInput) {
    const { page, limit, search, role } = query;
    const skip = (page - 1) * limit;

    const cleanSearch = search?.trim();

    const whereCondition = {
      hotelId,
      ...(role ? { role } : {}),
      ...(cleanSearch
        ? {
            OR: [
              { name: { contains: cleanSearch, mode: 'insensitive' as const } },
              { email: { contains: cleanSearch, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.employee.count({ where: whereCondition }),
      prisma.employee.findMany({
        where: whereCondition,
        select: {
          id: true,
          hotelId: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getEmployeeById(hotelId: string, id: string) {
    const employee = await prisma.employee.findFirst({
      where: { id, hotelId },
      select: {
        id: true,
        hotelId: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!employee) {
      throw new NotFoundError('Funcionário', id);
    }

    return employee;
  }

  async createEmployee(hotelId: string, input: CreateEmployeeInput) {
    const { name, email, password, role } = input;
    const cleanEmail = email.toLowerCase();

    // Consulta incluindo deletados para tratar re-cadastro e evitar violação de constraint no banco
    const existingEmployee = await basePrisma.employee.findFirst({
      where: { hotelId, email: cleanEmail },
    });

    const passwordHash = await bcrypt.hash(password, 10);

    if (existingEmployee) {
      if (existingEmployee.deletedAt === null) {
        throw new EmailAlreadyInUseError('Este e-mail já está cadastrado para outro funcionário neste hotel.');
      }

      // Reativação automática do registro desativado por soft delete
      const reactivated = await basePrisma.employee.update({
        where: { id: existingEmployee.id },
        data: {
          name,
          passwordHash,
          role,
          deletedAt: null,
        },
        select: {
          id: true,
          hotelId: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return reactivated;
    }

    const employee = await prisma.employee.create({
      data: {
        hotelId,
        name,
        email: cleanEmail,
        passwordHash,
        role,
      },
      select: {
        id: true,
        hotelId: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return employee;
  }

  async updateEmployee(hotelId: string, id: string, input: UpdateEmployeeInput) {
    const currentEmployee = await this.getEmployeeById(hotelId, id);

    // Proteção contra rebaixamento do único Administrador ativo
    if (
      input.role &&
      input.role === EmployeeRole.STAFF &&
      currentEmployee.role === EmployeeRole.ADMIN
    ) {
      const activeAdminCount = await prisma.employee.count({
        where: { hotelId, role: EmployeeRole.ADMIN },
      });

      if (activeAdminCount <= 1) {
        throw new ForbiddenError('Não é possível rebaixar a função do único administrador ativo do hotel.');
      }
    }

    const dataToUpdate: any = {};

    if (input.name !== undefined) dataToUpdate.name = input.name;
    if (input.role !== undefined) dataToUpdate.role = input.role;

    if (input.email !== undefined) {
      const cleanEmail = input.email.toLowerCase();
      const existingEmail = await prisma.employee.findFirst({
        where: {
          hotelId,
          email: cleanEmail,
          id: { not: id },
        },
      });

      if (existingEmail) {
        throw new EmailAlreadyInUseError('Este e-mail já está em uso por outro funcionário.');
      }
      dataToUpdate.email = cleanEmail;
    }

    if (input.password !== undefined && input.password.trim() !== '') {
      dataToUpdate.passwordHash = await bcrypt.hash(input.password, 10);
    }

    const updatedEmployee = await prisma.employee.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        hotelId: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedEmployee;
  }

  async deleteEmployee(hotelId: string, id: string, currentUserId?: string) {
    // Bloqueio de auto-deleção
    if (currentUserId && id === currentUserId) {
      throw new ForbiddenError('Não é possível remover a sua própria conta.');
    }

    const employee = await this.getEmployeeById(hotelId, id);

    // Proteção de exclusão do único Administrador ativo
    if (employee.role === EmployeeRole.ADMIN) {
      const activeAdminCount = await prisma.employee.count({
        where: { hotelId, role: EmployeeRole.ADMIN },
      });

      if (activeAdminCount <= 1) {
        throw new ForbiddenError('Não é possível remover o único administrador ativo do hotel.');
      }
    }

    await prisma.employee.delete({
      where: { id },
    });

    return { message: 'Funcionário removido com sucesso.' };
  }
}
