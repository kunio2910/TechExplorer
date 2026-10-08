import { allProducts } from "@/lib/store";
import Explorer from "@/components/Explorer";
import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const products = (await allProducts()).filter(
    (p) => p.status === "published",
  );
  if (category !== "mainboard" || !products.some((p) => p.slug === slug))
    notFound();
  return <Explorer products={products} initialSlug={slug} />;
}
