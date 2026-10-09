import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
  type Unsubscribe,
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

/**
 * Translate Firebase's terse error codes into an actionable message for the
 * content studio. Firestore reports both an undeployed rules file and a
 * missing admin marker as `permission-denied`, so the hint covers both.
 */
export function firebaseErrorCode(error: unknown): string {
  if (!error || typeof error !== "object" || !("code" in error)) return "";
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : "";
}

export function firestoreErrorMessage(
  error: unknown,
  action: string,
  adminUid?: string,
): string {
  const code = firebaseErrorCode(error);

  if (code === "permission-denied") {
    const adminPath = adminUid ? `admins/${adminUid}` : "admins/{UID}";
    return `Firestore từ chối quyền ${action}. Hãy deploy firestore.rules và tạo document ${adminPath} trong Firestore cho tài khoản đang đăng nhập (permission-denied).`;
  }
  if (code === "failed-precondition") {
    return `Firestore chưa sẵn sàng để ${action}. Hãy kiểm tra đã tạo Firestore Database ở đúng project techexplorer-38d83 (failed-precondition).`;
  }
  if (code === "unavailable" || code === "deadline-exceeded") {
    return `Không thể ${action} Firestore lúc này. Hãy kiểm tra kết nối mạng rồi thử lại (${code}).`;
  }

  return `Không thể ${action} dữ liệu Firestore${code ? ` (${code})` : ""}. Hãy kiểm tra cấu hình Firebase và Rules.`;
}

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

export function subscribeToPublishedProducts(
  onProducts: (products: Product[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    query(productsCollection, where("status", "==", "published")),
    (snapshot) => {
      onProducts(
        snapshot.docs.map((item) => productFromDocument(item.id, item.data())),
      );
    },
    onError,
  );
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
  if (
    category === "CPU" ||
    category === "RAM" ||
    category === "GPU" ||
    category === "PSU"
  ) {
    return category;
  }
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

export function subscribeToPublishedComponents(
  onComponents: (components: CatalogComponent[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    query(componentsCollection, where("status", "==", "published")),
    (snapshot) => {
      onComponents(
        snapshot.docs.map(
          (item) => ({ id: item.id, ...item.data() }) as CatalogComponent,
        ),
      );
    },
    onError,
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
          imageUrl: "",
          gallery: [],
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
