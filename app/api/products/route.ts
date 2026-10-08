import { allProducts, saveProduct, deleteProduct } from "@/lib/store";
import { authorized } from "@/lib/auth";
import { validateProduct } from "@/lib/validation";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const query =
      new URL(request.url).searchParams.get("q")?.toLowerCase() ?? "";
    const products = (await allProducts()).filter(
      (p) =>
        (authorized(request) || p.status === "published") &&
        JSON.stringify([p.name, p.category, p.spec])
          .toLowerCase()
          .includes(query),
    );
    return Response.json(products);
  } catch {
    return Response.json(
      { error: "Unable to load products." },
      { status: 503 },
    );
  }
}
export async function POST(request: Request) {
  if (!authorized(request))
    return Response.json({ error: "Admin token required." }, { status: 401 });
  try {
    const p = validateProduct(await request.json());
    const products = await allProducts();
    if (products.some((x) => x.slug === p.slug && x.id !== p.id))
      throw Error("Slug already exists.");
    await saveProduct(p);
    return Response.json(p);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
export async function DELETE(request: Request) {
  if (!authorized(request))
    return Response.json({ error: "Admin token required." }, { status: 401 });
  try {
    const { id } = await request.json();
    await deleteProduct(id);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Delete failed." }, { status: 400 });
  }
}
