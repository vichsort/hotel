import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmployeeService } from '@/modules/employee/employee.service.js';
import { prisma, basePrisma } from '@/shared/prisma/client.js';
import { EmailAlreadyInUseError, NotFoundError, ForbiddenError } from '@/shared/errors/index.js';
import { EmployeeRole } from '@prisma/client';

vi.mock('@/shared/prisma/client.js', () => ({
  prisma: {
    employee: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
  basePrisma: {
    employee: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('EmployeeService', () => {
  let employeeService: EmployeeService;

  beforeEach(() => {
    employeeService = new EmployeeService();
    vi.clearAllMocks();
  });

  describe('listEmployees', () => {
    it('deve listar funcionários paginados para um hotel', async () => {
      const mockItems = [
        { id: 'emp-1', name: 'Ana', email: 'ana@hotel.com', role: EmployeeRole.STAFF },
        { id: 'emp-2', name: 'Bruno', email: 'bruno@hotel.com', role: EmployeeRole.ADMIN },
      ];

      vi.mocked(prisma.employee.count).mockResolvedValue(2);
      vi.mocked(prisma.employee.findMany).mockResolvedValue(mockItems as any);

      const result = await employeeService.listEmployees('hotel-1', { page: 1, limit: 10, search: '  Ana  ' });

      expect(result.items).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(prisma.employee.findMany).toHaveBeenCalled();
    });
  });

  describe('getEmployeeById', () => {
    it('deve retornar o funcionário se for encontrado no hotel', async () => {
      const mockEmployee = { id: 'emp-1', hotelId: 'hotel-1', name: 'Ana', email: 'ana@hotel.com' };
      vi.mocked(prisma.employee.findFirst).mockResolvedValue(mockEmployee as any);

      const result = await employeeService.getEmployeeById('hotel-1', 'emp-1');

      expect(result.id).toBe('emp-1');
    });

    it('deve lançar NotFoundError se o funcionário não existir', async () => {
      vi.mocked(prisma.employee.findFirst).mockResolvedValue(null);

      await expect(employeeService.getEmployeeById('hotel-1', 'emp-999')).rejects.toThrow(NotFoundError);
    });
  });

  describe('createEmployee', () => {
    it('deve criar um novo funcionário com sucesso', async () => {
      const input = { name: 'Lucas', email: 'lucas@hotel.com', password: 'secretpassword', role: EmployeeRole.STAFF };

      vi.mocked(basePrisma.employee.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.employee.create).mockResolvedValue({ id: 'emp-3', hotelId: 'hotel-1', ...input } as any);

      const result = await employeeService.createEmployee('hotel-1', input);

      expect(result.id).toBe('emp-3');
      expect(prisma.employee.create).toHaveBeenCalled();
    });

    it('deve reativar a conta se o funcionário já existia em soft delete', async () => {
      const input = { name: 'Lucas Reativado', email: 'lucas@hotel.com', password: 'secretpassword', role: EmployeeRole.STAFF };
      const softDeletedEmployee = { id: 'emp-deleted', hotelId: 'hotel-1', email: 'lucas@hotel.com', deletedAt: new Date() };

      vi.mocked(basePrisma.employee.findFirst).mockResolvedValue(softDeletedEmployee as any);
      vi.mocked(basePrisma.employee.update).mockResolvedValue({ id: 'emp-deleted', deletedAt: null, ...input } as any);

      const result = await employeeService.createEmployee('hotel-1', input);

      expect(result.id).toBe('emp-deleted');
      expect(basePrisma.employee.update).toHaveBeenCalled();
    });

    it('deve lançar EmailAlreadyInUseError se o funcionário já estiver ativo no hotel', async () => {
      const input = { name: 'Lucas', email: 'lucas@hotel.com', password: 'secretpassword', role: EmployeeRole.STAFF };
      const activeEmployee = { id: 'emp-active', hotelId: 'hotel-1', email: 'lucas@hotel.com', deletedAt: null };

      vi.mocked(basePrisma.employee.findFirst).mockResolvedValue(activeEmployee as any);

      await expect(employeeService.createEmployee('hotel-1', input)).rejects.toThrow(EmailAlreadyInUseError);
    });
  });

  describe('updateEmployee', () => {
    it('deve lançar ForbiddenError se tentar rebaixar o único administrador ativo do hotel', async () => {
      const currentAdmin = { id: 'admin-1', hotelId: 'hotel-1', role: EmployeeRole.ADMIN };
      vi.mocked(prisma.employee.findFirst).mockResolvedValue(currentAdmin as any);
      vi.mocked(prisma.employee.count).mockResolvedValue(1); // Apenas 1 admin ativo

      await expect(
        employeeService.updateEmployee('hotel-1', 'admin-1', { role: EmployeeRole.STAFF })
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('deleteEmployee', () => {
    it('deve lançar ForbiddenError ao tentar deletar a própria conta (auto-deleção)', async () => {
      await expect(employeeService.deleteEmployee('hotel-1', 'emp-1', 'emp-1')).rejects.toThrow(ForbiddenError);
    });

    it('deve lançar ForbiddenError se tentar deletar o único administrador ativo do hotel', async () => {
      const adminEmp = { id: 'admin-1', hotelId: 'hotel-1', role: EmployeeRole.ADMIN };
      vi.mocked(prisma.employee.findFirst).mockResolvedValue(adminEmp as any);
      vi.mocked(prisma.employee.count).mockResolvedValue(1); // Único admin

      await expect(employeeService.deleteEmployee('hotel-1', 'admin-1', 'outros-id')).rejects.toThrow(ForbiddenError);
    });

    it('deve deletar o funcionário se a exclusão for válida', async () => {
      const staffEmp = { id: 'staff-1', hotelId: 'hotel-1', role: EmployeeRole.STAFF };
      vi.mocked(prisma.employee.findFirst).mockResolvedValue(staffEmp as any);
      vi.mocked(prisma.employee.delete).mockResolvedValue(staffEmp as any);

      const result = await employeeService.deleteEmployee('hotel-1', 'staff-1', 'admin-user');

      expect(result.message).toContain('removido com sucesso');
    });
  });
});
