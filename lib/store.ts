import { PrismaClient, Prisma } from "@prisma/client";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { Product } from "./types";
import { seedProducts } from "./seed";
const globalDb = globalThis as unknown as { db?: PrismaClient };
const db = globalDb.db ?? new PrismaClient();
globalDb.db = db;
const file = path.join(process.cwd(), "data", "products.json");
function normalizeProduct(product: Product): Product {
  const saved = product as Product & { components?: Product["components"] };
  const defaults =
    seedProducts.find((seed) => seed.id === product.id)?.components ?? [];
  return {
    ...product,
    components: Array.isArray(saved.components) ? saved.components : defaults,
  };
}
export async function allProducts(): Promise<Product[]> {
  if (process.env.DATABASE_URL)
    return (await db.product.findMany()).map((product) =>
      normalizeProduct(product as unknown as Product),
    );
  try {
    return (JSON.parse(await readFile(file, "utf8")) as Product[]).map(
      normalizeProduct,
    );
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
      components: product.components as Prisma.InputJsonValue,
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
