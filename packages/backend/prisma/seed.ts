import "dotenv/config";
import { hash } from "argon2";
import { PrismaClient } from "./generated/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL!),
});

async function main() {
  console.log("Inicio del seed...");

  // Limpiar en orden inverso por FK
  await prisma.$transaction([
    prisma.machineUsage.deleteMany(),
    prisma.weightRecord.deleteMany(),
    prisma.livestockEvent.deleteMany(),
    prisma.livestockMovement.deleteMany(),
    prisma.livestock.deleteMany(),
    prisma.task.deleteMany(),
    prisma.taskType.deleteMany(),
    prisma.user.deleteMany(),
    prisma.machine.deleteMany(),
    prisma.lot.deleteMany(),
    prisma.farm.deleteMany(),
    prisma.company.deleteMany(),
  ]);

  // Company propietaria (multi-tenant dueño de las firmas)
  const eliggi = await prisma.company.create({
    data: { name: "Eliggi", cuit: "20-30111222-4" },
  });

  // Firmas / estabelecimientos (Farms)
  const farmAgro = await prisma.farm.create({
    data: { companyId: eliggi.id, name: "Agro-Sur", location: "33° 23' S · 62° 18' O", surface: 308 },
  });
  const farmVerde = await prisma.farm.create({
    data: { companyId: eliggi.id, name: "Campo Verde", location: "33° 41' S · 61° 55' O", surface: 262 },
  });
  const farmPinos = await prisma.farm.create({
    data: { companyId: eliggi.id, name: "Estancia Los Pinos", location: "32° 58' S · 62° 31' O", surface: 380 },
  });

  // Lotes de Agro-Sur
  const loteAggro1 = await prisma.lot.create({
    data: { farmId: farmAgro.id, name: "Lote N°1", area: 96, coords: "33° 23' S · 62° 18' O" },
  });
  const loteAgro2 = await prisma.lot.create({
    data: { farmId: farmAgro.id, name: "Lote N°2", area: 124, coords: "33° 24' S · 62° 17' O" },
  });
  const loteAgro3 = await prisma.lot.create({
    data: { farmId: farmAgro.id, name: "Lote N°3", area: 88, coords: "33° 22' S · 62° 19' O" },
  });
  // Lotes de Campo Verde
  const loteVerde1 = await prisma.lot.create({
    data: { farmId: farmVerde.id, name: "Lote N°1", area: 150, coords: "33° 41' S · 61° 55' O" },
  });
  const loteVerde2 = await prisma.lot.create({
    data: { farmId: farmVerde.id, name: "Lote N°2", area: 112, coords: "33° 40' S · 61° 54' O" },
  });
  // Lotes de Los Pinos
  const lotePinoA = await prisma.lot.create({
    data: { farmId: farmPinos.id, name: "Lote A", area: 210, coords: "32° 58' S · 62° 31' O" },
  });
  const lotePinoB = await prisma.lot.create({
    data: { farmId: farmPinos.id, name: "Lote B", area: 170, coords: "32° 57' S · 62° 30' O" },
  });

  // Tipos de tarea
  const tpPulverizacion = await prisma.taskType.create({ data: { name: "Pulverización", description: "Aplicación de fitosanitarios" } });
  const tpFertilizacion = await prisma.taskType.create({ data: { name: "Fertilización", description: "Aporte de nutrientes" } });
  const tpSiembra = await prisma.taskType.create({ data: { name: "Siembra", description: "Implantación de cultivo" } });
  const tpArranque = await prisma.taskType.create({ data: { name: "Arranque de equipo", description: "Puesta en marcha y checklist" } });
  const tpTraslado = await prisma.taskType.create({ data: { name: "Traslado", description: "Movimiento de hacienda" } });
  const tpPesaje = await prisma.taskType.create({ data: { name: "Pesaje", description: "Registro de peso" } });

  // Tareas de la jornada (produccion)
  await prisma.task.createMany({
    data: [
      { lotId: loteAggro1.id, taskTypeId: tpArranque.id, status: "FINALIZADA", startedAt: new Date("2026-09-02T06:00:00") },
      { lotId: loteAgro2.id, taskTypeId: tpPulverizacion.id, status: "FINALIZADA", startedAt: new Date("2026-09-02T07:00:00") },
      { lotId: loteAggro1.id, taskTypeId: tpFertilizacion.id, status: "FINALIZADA", startedAt: new Date("2026-09-02T08:30:00") },
      { lotId: loteVerde1.id, taskTypeId: tpSiembra.id, status: "EN_PROGRESO", startedAt: new Date("2026-09-02T10:15:00") },
      { lotId: lotePinoA.id, taskTypeId: tpPulverizacion.id, status: "PENDIENTE", startedAt: new Date("2026-09-02T12:00:00") },
    ],
  });

  // Máquinas (maquinaria)
  const mAgricola = await prisma.machine.createMany({
    data: [
      { companyId: eliggi.id, name: "John Deere 6130", brand: "John Deere", status: "ACTIVA" },
      { companyId: eliggi.id, name: "Case 7140", brand: "Case", status: "ACTIVA" },
      { companyId: eliggi.id, name: "Agrale 5020", brand: "Agrale", status: "MANTENIMIENTO" },
      { companyId: eliggi.id, name: "Fendt 1050", brand: "Fendt", status: "ACTIVA" },
    ],
  });

  // Usuario admin del tenant
  const hashPass = await hash("admin123");
  await prisma.user.create({
    data: {
      companyId: eliggi.id,
      email: "admin@eliggi.com",
      username: "admin",
      passwordHash: hashPass,
      role: "ADMIN",
    },
  });

  // Ganado (ganadero) y sus eventos/pesajes
  const c910 = await prisma.livestock.create({
    data: { companyId: eliggi.id, lotId: lotePinoA.id, tagNumber: "AR 0451 223 910", species: "Bovino", breed: "Angus", sex: "H", birthDate: new Date("2024-03-15") },
  });
  const c933 = await prisma.livestock.create({
    data: { companyId: eliggi.id, lotId: lotePinoA.id, tagNumber: "AR 0451 223 933", species: "Bovino", breed: "Angus", sex: "H", birthDate: new Date("2024-05-02") },
  });
  const c947 = await prisma.livestock.create({
    data: { companyId: eliggi.id, lotId: lotePinoA.id, tagNumber: "AR 0451 223 947", species: "Bovino", breed: "Angus", sex: "M", birthDate: new Date("2023-11-20") },
  });

  const admin = await prisma.user.findFirst({ where: { companyId: eliggi.id, role: "ADMIN" } });
  await prisma.livestockEvent.createMany({
    data: [
      { livestockId: c933.id, operatorId: admin!.id, type: "VACUNACION", observations: "B12 · lote A", eventDate: new Date("2026-09-12T09:00:00") },
      { livestockId: c933.id, operatorId: admin!.id, type: "TRATAMIENTO", observations: "Dosificación antiparasitaria", eventDate: new Date("2026-09-02T08:00:00") },
      { livestockId: c910.id, operatorId: admin!.id, type: "VACUNACION", observations: "Vacuna B12", eventDate: new Date("2026-09-10T09:00:00") },
    ],
  });
  await prisma.weightRecord.createMany({
    data: [
      { livestockId: c933.id, operatorId: admin!.id, weight: 480, measuredAt: new Date("2026-09-01T10:00:00") },
      { livestockId: c933.id, operatorId: admin!.id, weight: 462, measuredAt: new Date("2026-08-01T10:00:00") },
      { livestockId: c933.id, operatorId: admin!.id, weight: 438, measuredAt: new Date("2026-06-15T10:00:00") },
    ],
  });
  await prisma.livestockMovement.createMany({
    data: [
      { livestockId: c933.id, lotId: lotePinoB.id, movementDate: new Date("2026-09-02T11:00:00"), observations: "Potrero 4 → Potrero 7" },
    ],
  });

  console.log("Seed finalizado OK.");
  console.log("Farms:", (await prisma.farm.count()), "Lotes:", (await prisma.lot.count()), "Tareas:", (await prisma.task.count()));
  console.log("Maquinas:", (await prisma.machine.count()), "Animales:", (await prisma.livestock.count()));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });