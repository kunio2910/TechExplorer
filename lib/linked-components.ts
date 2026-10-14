import type { AssociatedComponent, CatalogComponent, Product } from "./types";
export function linkedProduct(
  product: Product,
  library: CatalogComponent[],
): Product {
  return {
    ...product,
    components: product.components.flatMap((entry) => {
      const catalogId =
        entry.catalogId ??
        (library.some(
          (item) => item.id === entry.id && item.category === entry.category,
        )
          ? entry.id
          : undefined);
      if (!catalogId) return [entry];
      const source = library.find(
        (item) =>
          item.id === catalogId &&
          item.status === "published" &&
          !item.deletedAt,
      );
      // Explicit links never silently fall back to stale, deleted or draft data.
      return source
        ? [
            {
              ...entry,
              catalogId,
              name: source.name,
              model: source.model,
              category: source.category,
            },
          ]
        : [];
    }),
  };
}
export function linkComponent(source: CatalogComponent): AssociatedComponent {
  return {
    id: crypto.randomUUID(),
    catalogId: source.id,
    category: source.category,
    name: source.name,
    model: source.model,
    compatibility: "warning",
    notes: "",
  };
}
