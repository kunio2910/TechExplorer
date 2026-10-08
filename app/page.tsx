import { allProducts } from "@/lib/store";
import Explorer from "@/components/Explorer";
export const dynamic = "force-dynamic";
export default async function Page() {
  const products = (await allProducts()).filter(
    (p) => p.status === "published",
  );
  return <Explorer products={products} />;
}
