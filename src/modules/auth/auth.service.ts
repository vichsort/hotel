import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '@/shared/prisma/client.js';
import { env } from '@/config/env.js';
import { EmailAlreadyInUseError, InvalidCredentialsError, NotFoundError } from '@/shared/errors/index.js';
import type { RegisterHotelInput, LoginInput } from '@/modules/auth/auth.schema.js';
import type { UserPayload } from '@/shared/types/express.d.js';
import { EmployeeRole } from '@prisma/client';

export class AuthService {
  async registerHotel(input: RegisterHotelInput) {
    const { hotelName, adminName, adminEmail, adminPassword } = input;
    const cleanEmail = adminEmail.toLowerCase();

    const existingEmployee = await prisma.employee.findFirst({
      where: { email: cleanEmail },
    });

    if (existingEmployee) {
      throw new EmailAlreadyInUseError('Este e-mail já está cadastrado no sistema.');
    }

    const passwordHash = await bcrypt.hash(adminPassword, 10);

    const result = await prisma.$transaction(async (tx) => {
      const hotel = await tx.hotel.create({
        data: { name: hotelName },
      });

      const admin = await tx.employee.create({
        data: {
          hotelId: hotel.id,
          name: adminName,
          email: cleanEmail,
          passwordHash,
          role: EmployeeRole.ADMIN,
        },
      });

      return { hotel, admin };
    });

    const payload: UserPayload = {
      id: result.admin.id,
      hotelId: result.hotel.id,
      role: result.admin.role,
      email: result.admin.email,
    };

    const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '8h' });

    return {
      token,
      user: {
        id: result.admin.id,
        name: result.admin.name,
        email: result.admin.email,
        role: result.admin.role,
      },
      hotel: {
        id: result.hotel.id,
        name: result.hotel.name,
      },
    };
  }

  async login(input: LoginInput) {
    const { hotelId, email, password } = input;
    const cleanEmail = email.toLowerCase();

    const employee = await prisma.employee.findFirst({
      where: {
        hotelId,
        email: cleanEmail,
      },
      include: { hotel: true },
    });

    if (!employee) {
      throw new InvalidCredentialsError('Credenciais incorretas.');
    }

    const isPasswordValid = await bcrypt.compare(password, employee.passwordHash);
    if (!isPasswordValid) {
      throw new InvalidCredentialsError('Credenciais incorretas.');
    }

    const payload: UserPayload = {
      id: employee.id,
      hotelId: employee.hotelId,
      role: employee.role,
      email: employee.email,
    };

    const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '8h' });

    return {
      token,
      user: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
      },
      hotel: {
        id: employee.hotel.id,
        name: employee.hotel.name,
      },
    };
  }

  async getProfile(userId: string) {
    const employee = await prisma.employee.findUnique({
      where: { id: userId },
      include: { hotel: true },
    });

    if (!employee) {
      throw new NotFoundError('Funcionário', userId);
    }

    return {
      user: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
      },
      hotel: {
        id: employee.hotel.id,
        name: employee.hotel.name,
      },
    };
  }
}
