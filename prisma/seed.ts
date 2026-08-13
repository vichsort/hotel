import 'dotenv/config';
import { PrismaClient, EmployeeRole, RoomStatus, OrderStatus, OrderSource } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL não foi definida nas variáveis de ambiente.');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Iniciando processo de seed do banco de dados...\n');

  // 1. Limpeza do banco de dados na ordem correta de FKs
  console.log('🧹 Limpando dados existentes...');
  await prisma.orderStatusHistory.deleteMany();
  await prisma.order.deleteMany();
  await prisma.room.deleteMany();
  await prisma.roomType.deleteMany();
  await prisma.guest.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.hotel.deleteMany();
  console.log('✅ Banco de dados limpo com sucesso.\n');

  // 2. Criação dos Hotéis (Tenants)
  console.log('🏨 Criando Hotéis (Tenants)...');
  const hotelGrandView = await prisma.hotel.create({
    data: {
      name: 'Grand View Beach Resort',
    },
  });

  const hotelPousadaUrbano = await prisma.hotel.create({
    data: {
      name: 'Pousada Urbano',
    },
  });
  console.log(`✅ Hotéis criados: "${hotelGrandView.name}" e "${hotelPousadaUrbano.name}".\n`);

  // 3. Criação de Funcionários (Employees) com senhas criptografadas via bcrypt
  console.log('👤 Criando Funcionários com credenciais ativas...');
  const defaultAdminPassword = await bcrypt.hash('admin123', 10);
  const defaultStaffPassword = await bcrypt.hash('staff123', 10);

  const adminEmployee = await prisma.employee.create({
    data: {
      hotelId: hotelGrandView.id,
      name: 'Carlos Andrade',
      email: 'admin@grandview.com',
      passwordHash: defaultAdminPassword,
      role: EmployeeRole.ADMIN,
    },
  });

  const staffEmployee = await prisma.employee.create({
    data: {
      hotelId: hotelGrandView.id,
      name: 'Luciana Santos',
      email: 'recepcao@grandview.com',
      passwordHash: defaultStaffPassword,
      role: EmployeeRole.STAFF,
    },
  });

  // Employee para o segundo hotel (isolamento)
  await prisma.employee.create({
    data: {
      hotelId: hotelPousadaUrbano.id,
      name: 'Roberto Lima',
      email: 'admin@pousadaurbano.com',
      passwordHash: defaultAdminPassword,
      role: EmployeeRole.ADMIN,
    },
  });
  console.log('✅ Funcionários criados:');
  console.log('   - Admin: admin@grandview.com (Senha: admin123)');
  console.log('   - Staff: recepcao@grandview.com (Senha: staff123)\n');

  // 4. Criação de Tipos de Acomodação (RoomType)
  console.log('🛏️ Criando Tipos de Acomodação (RoomType)...');
  const roomTypeStandard = await prisma.roomType.create({
    data: {
      hotelId: hotelGrandView.id,
      name: 'Quarto Standard',
      description: 'Aconchegante e confortável com vista para o jardim, ar condicionado e Wi-Fi de alta velocidade.',
      basePrice: 180.00,
      images: [
        'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=800&q=80',
      ],
    },
  });

  const roomTypeDeluxe = await prisma.roomType.create({
    data: {
      hotelId: hotelGrandView.id,
      name: 'Suíte Luxo',
      description: 'Espaçosa suíte com cama king size, varanda privativa com vista panorâmica para o mar e banheira de hidromassagem.',
      basePrice: 350.00,
      images: [
        'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
      ],
    },
  });

  const roomTypeFamily = await prisma.roomType.create({
    data: {
      hotelId: hotelGrandView.id,
      name: 'Chalé Familiar',
      description: 'Chalé reservado com 2 quartos, cozinha compacta, churrasqueira privativa e espaço para toda a família.',
      basePrice: 480.00,
      images: [
        'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=800&q=80',
      ],
    },
  });
  console.log('✅ 3 Tipos de Acomodação criados.\n');

  // 5. Criação de Quartos Físicos (Room)
  console.log('🚪 Criando Quartos Físicos (Room)...');
  const room101 = await prisma.room.create({
    data: {
      hotelId: hotelGrandView.id,
      roomTypeId: roomTypeStandard.id,
      number: '101',
      floor: '1º Andar',
      status: RoomStatus.AVAILABLE,
    },
  });

  const room102 = await prisma.room.create({
    data: {
      hotelId: hotelGrandView.id,
      roomTypeId: roomTypeStandard.id,
      number: '102',
      floor: '1º Andar',
      status: RoomStatus.AVAILABLE,
    },
  });

  await prisma.room.create({
    data: {
      hotelId: hotelGrandView.id,
      roomTypeId: roomTypeStandard.id,
      number: '103',
      floor: '1º Andar',
      status: RoomStatus.CLEANING,
    },
  });

  await prisma.room.create({
    data: {
      hotelId: hotelGrandView.id,
      roomTypeId: roomTypeStandard.id,
      number: '104',
      floor: '1º Andar',
      status: RoomStatus.MAINTENANCE,
    },
  });

  const room201 = await prisma.room.create({
    data: {
      hotelId: hotelGrandView.id,
      roomTypeId: roomTypeDeluxe.id,
      number: '201',
      floor: '2º Andar',
      status: RoomStatus.AVAILABLE,
    },
  });

  await prisma.room.create({
    data: {
      hotelId: hotelGrandView.id,
      roomTypeId: roomTypeDeluxe.id,
      number: '202',
      floor: '2º Andar',
      status: RoomStatus.AVAILABLE,
    },
  });

  const room301 = await prisma.room.create({
    data: {
      hotelId: hotelGrandView.id,
      roomTypeId: roomTypeFamily.id,
      number: '301',
      floor: 'Térreo',
      status: RoomStatus.AVAILABLE,
    },
  });

  await prisma.room.create({
    data: {
      hotelId: hotelGrandView.id,
      roomTypeId: roomTypeFamily.id,
      number: '302',
      floor: 'Térreo',
      status: RoomStatus.AVAILABLE,
    },
  });
  console.log('✅ 8 Quartos físicos criados com status variados.\n');

  // 6. Criação de Hóspedes (Guest)
  console.log('🧳 Criando Hóspedes (Guest)...');
  const guest1 = await prisma.guest.create({
    data: {
      hotelId: hotelGrandView.id,
      name: 'Maria Oliveira',
      email: 'maria.oliveira@email.com',
      phone: '(11) 98765-4321',
    },
  });

  const guest2 = await prisma.guest.create({
    data: {
      hotelId: hotelGrandView.id,
      name: 'João Pedro Ferreira',
      email: 'joao.ferreira@email.com',
      phone: '(21) 99887-6655',
    },
  });

  const guest3 = await prisma.guest.create({
    data: {
      hotelId: hotelGrandView.id,
      name: 'Ana Clara Souza',
      email: 'ana.souza@email.com',
      phone: '(31) 99123-4567',
    },
  });

  const guest4 = await prisma.guest.create({
    data: {
      hotelId: hotelGrandView.id,
      name: 'Lucas Mendes',
      email: 'lucas.mendes@email.com',
      phone: '(41) 98456-7890',
    },
  });

  const guest5 = await prisma.guest.create({
    data: {
      hotelId: hotelGrandView.id,
      name: 'Fernanda Lima',
      email: 'fernanda.lima@email.com',
      phone: '(51) 99765-4321',
    },
  });
  console.log('✅ 5 Hóspedes cadastrados.\n');

  // Helper de Datas
  const now = new Date();
  const days = (n: number) => n * 24 * 60 * 60 * 1000;

  // 7. Criação de Pedidos e Reservas (Order) + Histórico (OrderStatusHistory)
  console.log('📋 Criando Pedidos/Reservas e Histórico de Status...');

  // Order 1: Finalizada (CHECKED_OUT) - Entrada manual
  const order1 = await prisma.order.create({
    data: {
      hotelId: hotelGrandView.id,
      guestId: guest1.id,
      roomTypeId: roomTypeStandard.id,
      roomId: room101.id,
      checkInDate: new Date(now.getTime() - days(15)),
      checkOutDate: new Date(now.getTime() - days(10)),
      numberOfGuests: 2,
      status: OrderStatus.CHECKED_OUT,
      source: OrderSource.MANUAL,
      notes: 'Hóspede solicitou andar baixo e silencioso.',
    },
  });

  await prisma.orderStatusHistory.createMany({
    data: [
      {
        orderId: order1.id,
        fromStatus: OrderStatus.PENDING,
        toStatus: OrderStatus.CONFIRMED,
        changedAt: new Date(now.getTime() - days(20)),
        changedByEmployeeId: adminEmployee.id,
      },
      {
        orderId: order1.id,
        fromStatus: OrderStatus.CONFIRMED,
        toStatus: OrderStatus.CHECKED_IN,
        changedAt: new Date(now.getTime() - days(15)),
        changedByEmployeeId: staffEmployee.id,
      },
      {
        orderId: order1.id,
        fromStatus: OrderStatus.CHECKED_IN,
        toStatus: OrderStatus.CHECKED_OUT,
        changedAt: new Date(now.getTime() - days(10)),
        changedByEmployeeId: staffEmployee.id,
      },
    ],
  });

  // Order 2: Em andamento (CHECKED_IN) - Importação CSV
  const order2 = await prisma.order.create({
    data: {
      hotelId: hotelGrandView.id,
      guestId: guest2.id,
      roomTypeId: roomTypeDeluxe.id,
      roomId: room201.id,
      checkInDate: new Date(now.getTime() - days(2)),
      checkOutDate: new Date(now.getTime() + days(3)),
      numberOfGuests: 2,
      status: OrderStatus.CHECKED_IN,
      source: OrderSource.CSV_IMPORT,
      notes: 'Reserva importada da planilha/extranet Booking.com.',
    },
  });

  await prisma.orderStatusHistory.createMany({
    data: [
      {
        orderId: order2.id,
        fromStatus: OrderStatus.PENDING,
        toStatus: OrderStatus.CONFIRMED,
        changedAt: new Date(now.getTime() - days(10)),
        changedByEmployeeId: null, // Ação automática da importação
      },
      {
        orderId: order2.id,
        fromStatus: OrderStatus.CONFIRMED,
        toStatus: OrderStatus.CHECKED_IN,
        changedAt: new Date(now.getTime() - days(2)),
        changedByEmployeeId: staffEmployee.id,
      },
    ],
  });

  // Order 3: Confirmada Futura (CONFIRMED) - Entrada manual
  const order3 = await prisma.order.create({
    data: {
      hotelId: hotelGrandView.id,
      guestId: guest3.id,
      roomTypeId: roomTypeFamily.id,
      roomId: room301.id,
      checkInDate: new Date(now.getTime() + days(2)),
      checkOutDate: new Date(now.getTime() + days(7)),
      numberOfGuests: 4,
      status: OrderStatus.CONFIRMED,
      source: OrderSource.MANUAL,
      notes: 'Solicitou berço extra e café da manhã especial sem glúten.',
    },
  });

  await prisma.orderStatusHistory.create({
    data: {
      orderId: order3.id,
      fromStatus: OrderStatus.PENDING,
      toStatus: OrderStatus.CONFIRMED,
      changedAt: new Date(now.getTime() - days(1)),
      changedByEmployeeId: adminEmployee.id,
    },
  });

  // Order 4: Pendente (PENDING) - Chat Widget
  const order4 = await prisma.order.create({
    data: {
      hotelId: hotelGrandView.id,
      guestId: guest4.id,
      roomTypeId: roomTypeStandard.id,
      roomId: null, // Sem quarto fixado ainda
      checkInDate: new Date(now.getTime() + days(5)),
      checkOutDate: new Date(now.getTime() + days(8)),
      numberOfGuests: 1,
      status: OrderStatus.PENDING,
      source: OrderSource.CHAT_WIDGET,
      notes: 'Reserva efetuada via Widget do site. Aguardando confirmação do pagamento do sinal.',
    },
  });

  await prisma.orderStatusHistory.create({
    data: {
      orderId: order4.id,
      fromStatus: OrderStatus.PENDING,
      toStatus: OrderStatus.PENDING,
      changedAt: new Date(now.getTime() - days(1)),
      changedByEmployeeId: null, // Bot chatbot
    },
  });

  // Order 5: Cancelada (CANCELLED) - Entrada manual
  const order5 = await prisma.order.create({
    data: {
      hotelId: hotelGrandView.id,
      guestId: guest5.id,
      roomTypeId: roomTypeDeluxe.id,
      roomId: null,
      checkInDate: new Date(now.getTime() + days(10)),
      checkOutDate: new Date(now.getTime() + days(14)),
      numberOfGuests: 2,
      status: OrderStatus.CANCELLED,
      source: OrderSource.MANUAL,
      notes: 'Cancelado a pedido do cliente por imprevisto médico.',
    },
  });

  await prisma.orderStatusHistory.create({
    data: {
      orderId: order5.id,
      fromStatus: OrderStatus.PENDING,
      toStatus: OrderStatus.CANCELLED,
      changedAt: new Date(now.getTime() - days(3)),
      changedByEmployeeId: adminEmployee.id,
    },
  });

  console.log('✅ 5 Pedidos criados abarcando todas as variações (CHECKED_OUT, CHECKED_IN, CONFIRMED, PENDING, CANCELLED) e origens (MANUAL, CSV_IMPORT, CHAT_WIDGET).\n');

  console.log('🎉 Seed executado com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante a execução do seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
