import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { firestore } from "./firebase-client";
import type {
  AssociatedComponent,
  CatalogComponent,
  CatalogComponentType,
  Product,
} from "./types";

const productsCollection = collection(firestore, "products");
const componentsCollection = collection(firestore, "components");

function clean<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function productFromDocument(
  id: string,
  data: Record<string, unknown>,
): Product {
  return { id, ...data } as Product;
}

export async function loadPublishedProducts(): Promise<Product[]> {
  const snapshot = await getDocs(
    query(productsCollection, where("status", "==", "published")),
  );
  return snapshot.docs.map((item) => productFromDocument(item.id, item.data()));
}

export async function loadAllProducts(): Promise<Product[]> {
  const snapshot = await getDocs(productsCollection);
  return snapshot.docs.map((item) => productFromDocument(item.id, item.data()));
}

export async function saveProduct(product: Product) {
  await setDoc(doc(firestore, "products", product.id), clean(product));
}

export async function deleteProduct(productId: string) {
  await deleteDoc(doc(firestore, "products", productId));
}

function componentType(
  category: AssociatedComponent["category"],
): CatalogComponentType | null {
  if (category === "CPU" || category === "RAM") return category;
  if (category === "Storage") return "SSD";
  return null;
}

export async function loadCatalogComponents(
  type?: CatalogComponentType,
): Promise<CatalogComponent[]> {
  const snapshot = type
    ? await getDocs(query(componentsCollection, where("type", "==", type)))
    : await getDocs(componentsCollection);
  return snapshot.docs.map(
    (item) => ({ id: item.id, ...item.data() }) as CatalogComponent,
  );
}

export async function saveCatalogComponent(component: CatalogComponent) {
  await setDoc(doc(firestore, "components", component.id), clean(component));
}

export async function deleteCatalogComponent(componentId: string) {
  await deleteDoc(doc(firestore, "components", componentId));
}

export async function seedProductsToFirestore(products: Product[]) {
  const components = new Map<string, CatalogComponent>();
  await Promise.all(
    products.map(async (product) => {
      await saveProduct(product);
      product.components.forEach((component) => {
        const type = componentType(component.category);
        if (!type || components.has(component.id)) return;
        components.set(component.id, {
          ...component,
          type,
          brand: "",
          description: component.notes,
          spec: {},
          status: "published",
        });
      });
    }),
  );
  await Promise.all(
    [...components.values()].map((component) =>
      saveCatalogComponent(component),
    ),
  );
  return { products: products.length, components: components.size };
}
