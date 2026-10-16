import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
  writeBatch,
  runTransaction,
  orderBy,
  limit,
  type Unsubscribe,
} from "firebase/firestore";
import { firestore } from "./firebase-client";
import { normalizeSpecs } from "./spec-units";
import type { Device } from "./catalog-tools";
import { localizeDevice } from "./vietnamese";
import type { CatalogBackup } from "./backup";

export async function restoreCatalog(backup: CatalogBackup) {
  const batch = writeBatch(firestore);
  for (const item of backup.products) {
    checkSize(item);
    batch.set(doc(firestore, "products", item.id), clean(item));
  }
  for (const item of backup.components) {
    checkSize(item);
    batch.set(doc(firestore, "components", item.id), clean(item));
  }
  await batch.commit();
}
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
  return localizeDevice({
    ...data,
    id,
    spec: normalizeSpecs(data.spec as Record<string, string>),
  } as Product);
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
  checkSize(product);
  await setDoc(
    doc(firestore, "products", product.id),
    clean({ ...product, spec: normalizeSpecs(product.spec) }),
  );
}

export async function deleteProduct(productId: string) {
  await deleteDeviceWithVersions("products", productId);
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
  return snapshot.docs.map((item) =>
    localizeDevice({
      ...item.data(),
      id: item.id,
      spec: normalizeSpecs(item.data().spec),
    } as CatalogComponent),
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
        snapshot.docs.map((item) =>
          localizeDevice({
            ...item.data(),
            id: item.id,
            spec: normalizeSpecs(item.data().spec),
          } as CatalogComponent),
        ),
      );
    },
    onError,
  );
}

export async function saveCatalogComponent(component: CatalogComponent) {
  checkSize(component);
  await setDoc(
    doc(firestore, "components", component.id),
    clean({ ...component, spec: normalizeSpecs(component.spec) }),
  );
}
export type DeviceVersion = {
  id: string;
  savedAt: string;
  by: string;
  snapshot: Device;
};
export async function saveVersionedDevice(
  item: Device,
  original: Device | undefined,
) {
  const group = "media" in item ? "products" : "components";
  const next = clean({ ...item, spec: normalizeSpecs(item.spec) });
  checkSize(next);
  const ref = doc(firestore, group, item.id),
    at = item.updatedAt ?? new Date().toISOString();
  const version = doc(collection(ref, "versions"), encodeURIComponent(at));
  await runTransaction(firestore, async (transaction) => {
    const previous = await transaction.get(ref);
    if (previous.exists()) {
      if (
        !original ||
        (previous.data().updatedAt ?? "") !== (original.updatedAt ?? "")
      )
        throw Error(
          "Dữ liệu đã được thay đổi ở nơi khác. Bản nháp vẫn được giữ. Hãy tải lại danh sách và đối chiếu trước khi lưu.",
        );
      const previousVersion = doc(
        collection(ref, "versions"),
        encodeURIComponent(previous.data().updatedAt ?? "initial"),
      );
      transaction.set(previousVersion, {
        savedAt: previous.data().updatedAt ?? at,
        by: previous.data().updatedBy ?? "Bản trước khi lưu",
        snapshot: previous.data(),
      });
    } else if (original)
      throw Error("Thiết bị đã bị xóa ở nơi khác. Hãy tải lại danh sách.");
    transaction.set(version, {
      savedAt: at,
      by: item.updatedBy ?? "Quản trị",
      snapshot: next,
    });
    transaction.set(ref, next);
  });
}
export async function loadDeviceVersions(
  group: "products" | "components",
  id: string,
): Promise<DeviceVersion[]> {
  const result = await getDocs(
    query(
      collection(firestore, group, id, "versions"),
      orderBy("savedAt", "desc"),
      limit(20),
    ),
  );
  return result.docs.map(
    (item) => ({ id: item.id, ...item.data() }) as DeviceVersion,
  );
}
function checkSize(value: unknown) {
  if (new TextEncoder().encode(JSON.stringify(value)).length > 900000)
    throw new Error(
      "Dữ liệu ảnh quá lớn. Hãy giảm số ảnh hoặc dùng URL trước khi lưu.",
    );
}

export async function deleteCatalogComponent(componentId: string) {
  await deleteDeviceWithVersions("components", componentId);
}
async function deleteDeviceWithVersions(
  group: "products" | "components",
  id: string,
) {
  // Firestore leaves subcollections behind when their parent is deleted.
  for (;;) {
    const versions = await getDocs(
      query(collection(firestore, group, id, "versions"), limit(200)),
    );
    if (versions.empty) break;
    const batch = writeBatch(firestore);
    versions.docs.forEach((version) => batch.delete(version.ref));
    await batch.commit();
  }
  await deleteDoc(doc(firestore, group, id));
}

export async function seedProductsToFirestore(
  products: Product[],
  sampleComponents: CatalogComponent[] = [],
) {
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
  for (const component of sampleComponents) components.set(component.id, component);
  await Promise.all(
    [...components.values()].map((component) =>
      saveCatalogComponent(component),
    ),
  );
  return { products: products.length, components: components.size };
}
