import { PrismaClient, Prisma } from "@prisma/client";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { Product } from "./types";
import { seedProducts } from "./seed";
const globalDb = globalThis as unknown as { db?: PrismaClient };
const db = globalDb.db ?? new PrismaClient();
globalDb.db = db;
const file = path.join(process.cwd(), "data", "products.json");
export async function allProducts(): Promise<Product[]> {
  if (process.env.DATABASE_URL)
    return (await db.product.findMany()) as unknown as Product[];
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    return structuredClone(seedProducts);
  }
}
export async function saveProduct(product: Product) {
  if (process.env.DATABASE_URL) {
    const data = {
      ...product,
      spec: product.spec as Prisma.InputJsonValue,
      media: product.media as Prisma.InputJsonValue,
      hotspots: product.hotspots as Prisma.InputJsonValue,
    };
    await db.product.upsert({
      where: { id: product.id },
      create: data,
      update: data,
    });
    return;
  }
  const products = await allProducts();
  const i = products.findIndex((p) => p.id === product.id);
  if (i < 0) products.push(product);
  else products[i] = product;
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file + ".tmp", JSON.stringify(products, null, 2));
  await rename(file + ".tmp", file);
}
export async function deleteProduct(id: string) {
  if (process.env.DATABASE_URL) {
    await db.product.delete({ where: { id } });
    return;
  }
  const products = (await allProducts()).filter((p) => p.id !== id);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(products, null, 2));
}
