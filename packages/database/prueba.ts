import prisma from "./prisma";

async function main() {
  const uniqueSuffix = Date.now();
  const initialCuit = `30-${uniqueSuffix.toString().slice(-8)}-1`;

  console.log("\n1) CREATE company");
  const created = await prisma.company.create({
    data: {
      name: `Empresa Demo ${uniqueSuffix}`,
      cuit: initialCuit,
    },
  });
  console.log(created);

  console.log("\n2) READ company por id");
  const found = await prisma.company.findUnique({
    where: { id: created.id },
  });
  console.log(found);

  console.log("\n3) UPDATE company");
  const updated = await prisma.company.update({
    where: { id: created.id },
    data: {
      name: `${created.name} (actualizada)`,
    },
  });
  console.log(updated);

  console.log("\n4) DELETE company");
  const deleted = await prisma.company.delete({
    where: { id: created.id },
  });
  console.log(deleted);

  console.log("\nCRUD basico completado OK.");
}

main()
  .catch((error) => {
    console.error("Error ejecutando la prueba CRUD:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
