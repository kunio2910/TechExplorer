import { PrismaClient, Prisma } from "@prisma/client";
import { seedProducts } from "../lib/seed";
const db = new PrismaClient();
async function main() {
  for (const p of seedProducts) {
    const data = {
      ...p,
      spec: p.spec as Prisma.InputJsonValue,
      media: p.media as Prisma.InputJsonValue,
      hotspots: p.hotspots as Prisma.InputJsonValue,
    };
    await db.product.upsert({
      where: { id: p.id },
      create: data,
      update: data,
    });
  }
}
main().finally(() => db.$disconnect());
