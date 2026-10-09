// Development seed: multi-tenant bootstrap + demo data for the dashboards.
//
// Why this exists: `Company.tenantId` and `User.tenantId` are NOT NULL and every
// write path derives the tenant from the authenticated request, so an empty
// database cannot be bootstrapped through the API. This seed creates the minimum
// working set:
//   Tenant -> Company (firma) -> User -> UserCompany
// and then adds demo data adapted to the multi-firma schema so the Next.js
// dashboards (and especially the "Bandeja de Aprobacion de Partes Diarios")
// have something to render.
//
// Idempotent: demo tables are wiped in reverse-FK order and recreated with fixed
// ids; the tenant bootstrap uses upserts, so it is safe to run repeatedly.
// Run with: pnpm --filter backend db:seed
import 'dotenv/config';
import * as argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/client';

const TENANT_ID = '00000000-0000-4000-8000-000000000001';
const COMPANY_ID = '00000000-0000-4000-8000-000000000002';
const USER_ID = '00000000-0000-4000-8000-000000000003';
const USER_COMPANY_ID = '00000000-0000-4000-8000-000000000004';

const TENANT_NAME = process.env.SEED_TENANT_NAME ?? 'Grupo Eliggi';
const COMPANY_NAME = process.env.SEED_COMPANY_NAME ?? 'Eliggi';
const COMPANY_CUIT = process.env.SEED_COMPANY_CUIT ?? '30-00000000-1';
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@agrolify.local';
const ADMIN_USERNAME = process.env.SEED_ADMIN_USERNAME ?? 'admin';
const ADMIN_PASSWORD = requireSeedAdminPassword();

function requireSeedAdminPassword(): string {
  const value = process.env.SEED_ADMIN_PASSWORD;
  if (!value || value.trim().length === 0) {
    throw new Error(
      'SEED_ADMIN_PASSWORD is not set. Define it in the environment before running the seed.',
    );
  }
  return value;
}

// Deterministic ids for demo rows: 00000000-0000-4000-8000-000000000NNN.
// The bootstrap ids occupy 1..4, so demo rows start at 100 to avoid collisions.
const did = (n: number): string =>
  `00000000-0000-4000-8000-${n.toString().padStart(12, '0')}`;

async function main(): Promise<void> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL!),
  });

  try {
    // Wipe demo data in reverse-FK order. The tenant bootstrap rows (Tenant,
    // Company, User, UserCompany) are preserved and upserted right after.
    await prisma.$transaction([
      prisma.photo.deleteMany(),
      prisma.dailyReportItem.deleteMany(),
      prisma.dailyReport.deleteMany(),
      prisma.machineUsage.deleteMany(),
      prisma.machineActivity.deleteMany(),
      prisma.receptionItem.deleteMany(),
      prisma.reception.deleteMany(),
      prisma.stock.deleteMany(),
      prisma.recipeItem.deleteMany(),
      prisma.recipe.deleteMany(),
      prisma.livestockMovement.deleteMany(),
      prisma.weightRecord.deleteMany(),
      prisma.livestockEvent.deleteMany(),
      prisma.livestock.deleteMany(),
      prisma.machine.deleteMany(),
      prisma.task.deleteMany(),
      prisma.laborType.deleteMany(),
      prisma.lot.deleteMany(),
      prisma.farm.deleteMany(),
      prisma.client.deleteMany(),
      prisma.input.deleteMany(),
    ]);

    // --- Bootstrap: tenant -> firma -> user -> membership -------------------
    await prisma.tenant.upsert({
      where: { id: TENANT_ID },
      update: { name: TENANT_NAME },
      create: { id: TENANT_ID, name: TENANT_NAME },
    });

    await prisma.company.upsert({
      where: { id: COMPANY_ID },
      update: { name: COMPANY_NAME, tenantId: TENANT_ID },
      create: {
        id: COMPANY_ID,
        tenantId: TENANT_ID,
        name: COMPANY_NAME,
        cuit: COMPANY_CUIT,
      },
    });

    const passwordHash = await argon2.hash(ADMIN_PASSWORD);

    await prisma.user.upsert({
      where: { id: USER_ID },
      update: { tenantId: TENANT_ID, passwordHash, active: true },
      create: {
        id: USER_ID,
        tenantId: TENANT_ID,
        email: ADMIN_EMAIL,
        username: ADMIN_USERNAME,
        passwordHash,
        role: 'ADMIN',
      },
    });

    // Without an active membership the user has no `firmaId` and cannot log in.
    await prisma.userCompany.upsert({
      where: { userId_companyId: { userId: USER_ID, companyId: COMPANY_ID } },
      update: { role: 'ADMIN', active: true },
      create: {
        id: USER_COMPANY_ID,
        userId: USER_ID,
        companyId: COMPANY_ID,
        role: 'ADMIN',
      },
    });

    // --- Catalogos (tenant-owned) ------------------------------------------
    const clientEliggi = await prisma.client.create({
      data: {
        id: did(101),
        tenantId: TENANT_ID,
        name: 'Eliggi Producciones',
        cuit: '30-71234567-8',
      },
    });
    const clientSur = await prisma.client.create({
      data: {
        id: did(102),
        tenantId: TENANT_ID,
        name: 'Agro del Sur S.A.',
        cuit: '30-70987654-3',
      },
    });

    const inputGlifosato = await prisma.input.create({
      data: { id: did(110), tenantId: TENANT_ID, name: 'Glifosato 48%', unit: 'L' },
    });
    const input24D = await prisma.input.create({
      data: { id: did(111), tenantId: TENANT_ID, name: '2,4-D', unit: 'L' },
    });
    const inputUrea = await prisma.input.create({
      data: { id: did(112), tenantId: TENANT_ID, name: 'Urea', unit: 'kg' },
    });
    const inputAtrazina = await prisma.input.create({
      data: { id: did(113), tenantId: TENANT_ID, name: 'Atrazina', unit: 'L' },
    });
    const inputNpk = await prisma.input.create({
      data: { id: did(114), tenantId: TENANT_ID, name: 'Fertilizante NPK', unit: 'kg' },
    });

    const laborTypePulverizacion = await prisma.laborType.create({
      data: {
        id: did(120),
        tenantId: TENANT_ID,
        name: 'Pulverización',
        description: 'Aplicación de fitosanitarios',
      },
    });
    const laborTypeFertilizacion = await prisma.laborType.create({
      data: {
        id: did(121),
        tenantId: TENANT_ID,
        name: 'Fertilización',
        description: 'Aporte de nutrientes',
      },
    });
    const laborTypeSiembra = await prisma.laborType.create({
      data: {
        id: did(122),
        tenantId: TENANT_ID,
        name: 'Siembra',
        description: 'Implantación de cultivo',
      },
    });
    const laborTypeArranque = await prisma.laborType.create({
      data: {
        id: did(123),
        tenantId: TENANT_ID,
        name: 'Arranque de equipo',
        description: 'Puesta en marcha y checklist',
      },
    });
    const laborTypeTraslado = await prisma.laborType.create({
      data: {
        id: did(124),
        tenantId: TENANT_ID,
        name: 'Traslado',
        description: 'Movimiento de hacienda',
      },
    });
    const laborTypePesaje = await prisma.laborType.create({
      data: {
        id: did(125),
        tenantId: TENANT_ID,
        name: 'Pesaje',
        description: 'Registro de peso',
      },
    });

    // --- Campos y lotes ----------------------------------------------------
    const farmAgro = await prisma.farm.create({
      data: {
        id: did(130),
        clientId: clientEliggi.id,
        name: 'Agro-Sur',
        location: "33° 23' S · 62° 18' O",
        surface: 308,
      },
    });
    const farmVerde = await prisma.farm.create({
      data: {
        id: did(131),
        clientId: clientEliggi.id,
        name: 'Campo Verde',
        location: "33° 41' S · 61° 55' O",
        surface: 262,
      },
    });

    const lotAgro1 = await prisma.lot.create({
      data: { id: did(140), farmId: farmAgro.id, name: 'Lote N°1', area: 96, coords: "33° 23' S · 62° 18' O" },
    });
    const lotAgro2 = await prisma.lot.create({
      data: { id: did(141), farmId: farmAgro.id, name: 'Lote N°2', area: 124, coords: "33° 24' S · 62° 17' O" },
    });
    const lotAgro3 = await prisma.lot.create({
      data: { id: did(142), farmId: farmAgro.id, name: 'Lote N°3', area: 88, coords: "33° 22' S · 62° 19' O" },
    });
    const lotAgro4 = await prisma.lot.create({
      data: { id: did(143), farmId: farmAgro.id, name: 'Lote N°4', area: 70, coords: "33° 25' S · 62° 16' O" },
    });
    const lotVerdeA = await prisma.lot.create({
      data: { id: did(144), farmId: farmVerde.id, name: 'Lote A', area: 150, coords: "33° 41' S · 61° 55' O" },
    });
    const lotVerdeB = await prisma.lot.create({
      data: { id: did(145), farmId: farmVerde.id, name: 'Lote B', area: 112, coords: "33° 40' S · 61° 54' O" },
    });
    const lotVerdeC = await prisma.lot.create({
      data: { id: did(146), farmId: farmVerde.id, name: 'Lote C', area: 60, coords: "33° 42' S · 61° 56' O" },
    });

    // --- Tareas (pre-Sprint 2) --------------------------------------------
    const taskPulvAgro1 = await prisma.task.create({
      data: {
        id: did(150),
        lotId: lotAgro1.id,
        laborTypeId: laborTypePulverizacion.id,
        status: 'FINALIZADA',
        startedAt: new Date('2026-09-02T06:00:00'),
        finishedAt: new Date('2026-09-02T12:30:00'),
        operators: { connect: [{ id: USER_ID }] },
      },
    });
    const taskFertAgro2 = await prisma.task.create({
      data: {
        id: did(151),
        lotId: lotAgro2.id,
        laborTypeId: laborTypeFertilizacion.id,
        status: 'FINALIZADA',
        startedAt: new Date('2026-09-03T07:00:00'),
        finishedAt: new Date('2026-09-03T11:00:00'),
        operators: { connect: [{ id: USER_ID }] },
      },
    });
    const taskSiembraAgro3 = await prisma.task.create({
      data: {
        id: did(152),
        lotId: lotAgro3.id,
        laborTypeId: laborTypeSiembra.id,
        status: 'FINALIZADA',
        startedAt: new Date('2026-09-04T06:30:00'),
        finishedAt: new Date('2026-09-04T15:00:00'),
        operators: { connect: [{ id: USER_ID }] },
      },
    });
    const taskPulvAgro4 = await prisma.task.create({
      data: {
        id: did(153),
        lotId: lotAgro4.id,
        laborTypeId: laborTypePulverizacion.id,
        status: 'EN_PROGRESO',
        startedAt: new Date('2026-09-05T08:00:00'),
        operators: { connect: [{ id: USER_ID }] },
      },
    });
    const taskArranqueVerdeA = await prisma.task.create({
      data: {
        id: did(154),
        lotId: lotVerdeA.id,
        laborTypeId: laborTypeArranque.id,
        status: 'FINALIZADA',
        startedAt: new Date('2026-09-06T07:30:00'),
        finishedAt: new Date('2026-09-06T09:30:00'),
        operators: { connect: [{ id: USER_ID }] },
      },
    });
    await prisma.task.create({
      data: {
        id: did(155),
        lotId: lotVerdeB.id,
        laborTypeId: laborTypeFertilizacion.id,
        status: 'PENDIENTE',
        startedAt: new Date('2026-09-07T07:00:00'),
        operators: { connect: [{ id: USER_ID }] },
      },
    });
    await prisma.task.create({
      data: {
        id: did(156),
        lotId: lotVerdeC.id,
        laborTypeId: laborTypeTraslado.id,
        status: 'FINALIZADA',
        startedAt: new Date('2026-09-08T09:00:00'),
        finishedAt: new Date('2026-09-08T10:30:00'),
        operators: { connect: [{ id: USER_ID }] },
      },
    });

    // --- Tareas de hoy (tablero en vivo) ----------------------------------
    // Dates are computed at seed time so the board always shows current-day
    // tasks, regardless of when the seed runs. Mixed statuses across both
    // campos keep the operator assignment visible in the board.
    const todayAt = (hours: number, minutes: number): Date => {
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return date;
    };

    await prisma.task.create({
      data: {
        id: did(270),
        lotId: lotAgro1.id,
        laborTypeId: laborTypePulverizacion.id,
        status: 'PENDIENTE',
        startedAt: todayAt(7, 0),
        operators: { connect: [{ id: USER_ID }] },
      },
    });
    await prisma.task.create({
      data: {
        id: did(271),
        lotId: lotAgro2.id,
        laborTypeId: laborTypeFertilizacion.id,
        status: 'EN_PROGRESO',
        startedAt: todayAt(8, 30),
        operators: { connect: [{ id: USER_ID }] },
      },
    });
    await prisma.task.create({
      data: {
        id: did(272),
        lotId: lotVerdeA.id,
        laborTypeId: laborTypeSiembra.id,
        status: 'FINALIZADA',
        startedAt: todayAt(6, 0),
        finishedAt: todayAt(11, 30),
        operators: { connect: [{ id: USER_ID }] },
      },
    });
    await prisma.task.create({
      data: {
        id: did(273),
        lotId: lotVerdeB.id,
        laborTypeId: laborTypeArranque.id,
        status: 'EN_PROGRESO',
        startedAt: todayAt(9, 15),
        operators: { connect: [{ id: USER_ID }] },
      },
    });
    await prisma.task.create({
      data: {
        id: did(274),
        lotId: lotVerdeC.id,
        laborTypeId: laborTypePesaje.id,
        status: 'PENDIENTE',
        startedAt: todayAt(13, 0),
        operators: { connect: [{ id: USER_ID }] },
      },
    });

    // --- Partes diarios: 3 pendientes, 1 aprobado, 1 rechazado ------------
    const reportPendiente1 = await prisma.dailyReport.create({
      data: {
        id: did(160),
        operatorId: USER_ID,
        companyId: COMPANY_ID,
        taskId: taskPulvAgro1.id,
        lotId: lotAgro1.id,
        laborTypeId: laborTypePulverizacion.id,
        date: new Date('2026-09-02T00:00:00'),
        hectares: 96,
        hours: 6.5,
        status: 'PENDIENTE_APROBACION',
        items: {
          create: [
            { id: did(170), inputId: inputGlifosato.id, quantity: 120, unit: inputGlifosato.unit },
            { id: did(171), inputId: input24D.id, quantity: 45, unit: input24D.unit },
          ],
        },
      },
    });

    await prisma.dailyReport.create({
      data: {
        id: did(161),
        operatorId: USER_ID,
        companyId: COMPANY_ID,
        taskId: taskFertAgro2.id,
        lotId: lotAgro2.id,
        laborTypeId: laborTypeFertilizacion.id,
        date: new Date('2026-09-03T00:00:00'),
        hectares: 124,
        hours: 4,
        status: 'PENDIENTE_APROBACION',
        items: {
          create: [
            { id: did(172), inputId: inputUrea.id, quantity: 300, unit: inputUrea.unit },
            { id: did(173), inputId: inputNpk.id, quantity: 150, unit: inputNpk.unit },
          ],
        },
      },
    });

    await prisma.dailyReport.create({
      data: {
        id: did(162),
        operatorId: USER_ID,
        companyId: COMPANY_ID,
        taskId: taskSiembraAgro3.id,
        lotId: lotAgro3.id,
        laborTypeId: laborTypeSiembra.id,
        date: new Date('2026-09-04T00:00:00'),
        hectares: 88,
        hours: 8.5,
        status: 'PENDIENTE_APROBACION',
        items: {
          create: [
            { id: did(174), inputId: inputAtrazina.id, quantity: 60, unit: inputAtrazina.unit },
          ],
        },
      },
    });

    await prisma.dailyReport.create({
      data: {
        id: did(163),
        operatorId: USER_ID,
        companyId: COMPANY_ID,
        taskId: taskPulvAgro4.id,
        lotId: lotAgro4.id,
        laborTypeId: laborTypePulverizacion.id,
        date: new Date('2026-09-05T00:00:00'),
        hectares: 70,
        hours: 5,
        status: 'APROBADO',
        approvedAt: new Date('2026-09-06T09:00:00'),
        approvedBy: USER_ID,
        items: {
          create: [
            { id: did(175), inputId: inputGlifosato.id, quantity: 90, unit: inputGlifosato.unit },
            { id: did(176), inputId: input24D.id, quantity: 30, unit: input24D.unit },
            { id: did(177), inputId: inputUrea.id, quantity: 50, unit: inputUrea.unit },
          ],
        },
      },
    });

    await prisma.dailyReport.create({
      data: {
        id: did(164),
        operatorId: USER_ID,
        companyId: COMPANY_ID,
        taskId: taskArranqueVerdeA.id,
        lotId: lotVerdeA.id,
        laborTypeId: laborTypeArranque.id,
        date: new Date('2026-09-06T00:00:00'),
        hectares: 150,
        hours: 2,
        status: 'RECHAZADO',
        rejectionReason: 'Falta el detalle de combustible y las horas de operación de la máquina',
        items: {
          create: [
            { id: did(178), inputId: inputNpk.id, quantity: 25, unit: inputNpk.unit },
          ],
        },
      },
    });

    // --- Recepciones de insumos (pendientes de validacion) ----------------
    await prisma.reception.create({
      data: {
        id: did(180),
        clientId: clientEliggi.id,
        date: new Date('2026-09-01T00:00:00'),
        status: 'PENDIENTE_VALIDACION',
        items: {
          create: [
            { id: did(185), inputId: inputGlifosato.id, quantity: 200, unit: inputGlifosato.unit },
            { id: did(186), inputId: input24D.id, quantity: 100, unit: input24D.unit },
          ],
        },
      },
    });
    await prisma.reception.create({
      data: {
        id: did(181),
        clientId: clientSur.id,
        date: new Date('2026-09-02T00:00:00'),
        status: 'PENDIENTE_VALIDACION',
        items: {
          create: [
            { id: did(187), inputId: inputUrea.id, quantity: 500, unit: inputUrea.unit },
          ],
        },
      },
    });

    // --- Stock por cliente -------------------------------------------------
    await prisma.stock.createMany({
      data: [
        { id: did(190), clientId: clientEliggi.id, inputId: inputGlifosato.id, quantity: 5000 },
        { id: did(191), clientId: clientEliggi.id, inputId: input24D.id, quantity: 5000 },
        { id: did(192), clientId: clientEliggi.id, inputId: inputUrea.id, quantity: 5000 },
        { id: did(193), clientId: clientEliggi.id, inputId: inputAtrazina.id, quantity: 5000 },
        { id: did(194), clientId: clientEliggi.id, inputId: inputNpk.id, quantity: 5000 },
        { id: did(195), clientId: clientSur.id, inputId: inputGlifosato.id, quantity: 5000 },
        { id: did(196), clientId: clientSur.id, inputId: input24D.id, quantity: 5000 },
        { id: did(197), clientId: clientSur.id, inputId: inputUrea.id, quantity: 5000 },
        { id: did(198), clientId: clientSur.id, inputId: inputAtrazina.id, quantity: 5000 },
        { id: did(199), clientId: clientSur.id, inputId: inputNpk.id, quantity: 5000 },
      ],
    });

    // --- Maquinaria (CUU08) ------------------------------------------------
    const machineDeere = await prisma.machine.create({
      data: {
        id: did(200),
        companyId: COMPANY_ID,
        name: 'John Deere 6130',
        brand: 'John Deere',
        status: 'ACTIVA',
      },
    });
    await prisma.machine.create({
      data: {
        id: did(201),
        companyId: COMPANY_ID,
        name: 'Case 7140',
        brand: 'Case',
        status: 'ACTIVA',
      },
    });
    const machineAgrale = await prisma.machine.create({
      data: {
        id: did(202),
        companyId: COMPANY_ID,
        name: 'Agrale 5020',
        brand: 'Agrale',
        status: 'MANTENIMIENTO',
      },
    });

    await prisma.machineActivity.createMany({
      data: [
        {
          id: did(205),
          machineId: machineDeere.id,
          companyId: COMPANY_ID,
          type: 'COMBUSTIBLE',
          date: new Date('2026-09-02T05:30:00'),
          liters: 200,
          cost: 300000,
          receipt: 'FC-0001-00001234',
        },
        {
          id: did(206),
          machineId: machineAgrale.id,
          companyId: COMPANY_ID,
          type: 'MANTENIMIENTO',
          date: new Date('2026-09-03T14:00:00'),
          spareParts: 'Filtros y aceite',
          cost: 150000,
          observations: 'Service de 500 horas',
        },
      ],
    });

    await prisma.machineUsage.create({
      data: {
        id: did(210),
        taskId: taskPulvAgro1.id,
        machineId: machineDeere.id,
        initialFuel: 80,
        finalFuel: 55,
        usageHours: 6.5,
        observations: 'Pulverización de lote N°1',
      },
    });

    // --- Ganadero (se mantiene operativo) ---------------------------------
    const animal910 = await prisma.livestock.create({
      data: {
        id: did(220),
        companyId: COMPANY_ID,
        lotId: lotAgro1.id,
        tagNumber: 'AR 0451 223 910',
        species: 'Bovino',
        breed: 'Angus',
        sex: 'H',
        birthDate: new Date('2024-03-15'),
      },
    });
    const animal933 = await prisma.livestock.create({
      data: {
        id: did(221),
        companyId: COMPANY_ID,
        lotId: lotAgro1.id,
        tagNumber: 'AR 0451 223 933',
        species: 'Bovino',
        breed: 'Angus',
        sex: 'H',
        birthDate: new Date('2024-05-02'),
      },
    });
    await prisma.livestock.create({
      data: {
        id: did(222),
        companyId: COMPANY_ID,
        lotId: lotAgro1.id,
        tagNumber: 'AR 0451 223 947',
        species: 'Bovino',
        breed: 'Angus',
        sex: 'M',
        birthDate: new Date('2023-11-20'),
      },
    });

    await prisma.livestockEvent.createMany({
      data: [
        {
          id: did(230),
          livestockId: animal933.id,
          operatorId: USER_ID,
          type: 'VACUNACION',
          observations: 'B12 · lote N°1',
          eventDate: new Date('2026-09-12T09:00:00'),
        },
        {
          id: did(231),
          livestockId: animal933.id,
          operatorId: USER_ID,
          type: 'TRATAMIENTO',
          observations: 'Dosificación antiparasitaria',
          eventDate: new Date('2026-09-02T08:00:00'),
        },
        {
          id: did(232),
          livestockId: animal910.id,
          operatorId: USER_ID,
          type: 'VACUNACION',
          observations: 'Vacuna B12',
          eventDate: new Date('2026-09-10T09:00:00'),
        },
      ],
    });

    await prisma.weightRecord.createMany({
      data: [
        { id: did(240), livestockId: animal933.id, operatorId: USER_ID, weight: 480, measuredAt: new Date('2026-09-01T10:00:00') },
        { id: did(241), livestockId: animal933.id, operatorId: USER_ID, weight: 462, measuredAt: new Date('2026-08-01T10:00:00') },
        { id: did(242), livestockId: animal933.id, operatorId: USER_ID, weight: 438, measuredAt: new Date('2026-06-15T10:00:00') },
      ],
    });

    await prisma.livestockMovement.create({
      data: {
        id: did(250),
        livestockId: animal933.id,
        lotId: lotAgro2.id,
        movementDate: new Date('2026-09-02T11:00:00'),
        observations: 'Potrero 4 → Potrero 7',
      },
    });

    // --- Fotos de partes diarios (polimorfica) ----------------------------
    await prisma.photo.createMany({
      data: [
        {
          id: did(260),
          entityType: 'PARTE_DIARIO',
          entityId: reportPendiente1.id,
          localPath: 'demo/cuaderno-parte-1.jpg',
          orderIndex: 0,
        },
        {
          id: did(261),
          entityType: 'PARTE_DIARIO',
          entityId: reportPendiente1.id,
          localPath: 'demo/cuaderno-parte-2.jpg',
          orderIndex: 1,
        },
      ],
    });

    const [
      clientCount,
      inputCount,
      laborTypeCount,
      farmCount,
      lotCount,
      taskCount,
      reportCount,
      stockCount,
    ] = await prisma.$transaction([
      prisma.client.count(),
      prisma.input.count(),
      prisma.laborType.count(),
      prisma.farm.count(),
      prisma.lot.count(),
      prisma.task.count(),
      prisma.dailyReport.count(),
      prisma.stock.count(),
    ]);

    console.log('[seed] bootstrap OK');
    console.log(`[seed] tenant : ${TENANT_NAME} (${TENANT_ID})`);
    console.log(`[seed] firma  : ${COMPANY_NAME} (${COMPANY_ID})`);
    console.log(`[seed] login  : ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
    console.log(
      `[seed] demo   : clients=${clientCount} inputs=${inputCount} laborTypes=${laborTypeCount} ` +
        `farms=${farmCount} lots=${lotCount} tasks=${taskCount} dailyReports=${reportCount} stocks=${stockCount}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('[seed] failed');
  console.error(error);
  process.exit(1);
});
