"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { assetUrl, basePath } from "@/lib/runtime";
import { auth } from "@/lib/firebase-client";
import { componentGallery, productGallery } from "@/lib/gallery";
import { parseBackup, type CatalogBackup } from "@/lib/backup";
import {
  deleteCatalogComponent,
  deleteProduct,
  loadAllProducts,
  loadCatalogComponents,
  saveCatalogComponent,
  saveProduct,
  seedProductsToFirestore,
  firestoreErrorMessage,
  restoreCatalog,
  saveVersionedDevice,
} from "@/lib/firestore";
import AdminRecovery from "./AdminRecovery";
import ProductImport from "./ProductImport";
import AdminVersions from "./AdminVersions";
import AdminProductList from "./AdminProductList";
import AdminProductDetail from "./AdminProductDetail";
import { linkComponent } from "@/lib/linked-components";
import { normalizeSpecs, normalizeSpecValue } from "@/lib/spec-units";
import { categoryLabel } from "@/lib/labels";
import { seedCatalogComponents } from "@/lib/seed";
import type {
  AssociatedComponent,
  CatalogComponent,
  CatalogComponentType,
  Hotspot,
  Product,
} from "@/lib/types";
import {
  ArrowLeft,
  CircleX,
  Copy as CopyIcon,
  Download,
  List as ListIcon,
  Plus,
  Settings as SettingsIcon,
  Upload,
} from "lucide-react";
import ComponentCanvas from "./ComponentCanvas";
import ImageGallery from "./ImageGallery";
import MediaEditor from "./MediaEditor";
import ImageReferenceInput from "./ImageReferenceInput";
import {
  archive,
  unarchive,
  stamp,
  specTemplates,
  suggestionsForSpec,
  specLabel,
  publishChecks,
  type Device,
} from "@/lib/catalog-tools";

type AdminTab = "Mainboard" | CatalogComponentType;
type AdminView = "editor" | "list" | "settings" | "detail";
const tabs: AdminTab[] = ["Mainboard", "CPU", "RAM", "SSD", "GPU", "PSU"];
const statuses: AssociatedComponent["compatibility"][] = [
  "compatible",
  "warning",
  "incompatible",
];

const makeId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const copy = <T,>(value: T) => JSON.parse(JSON.stringify(value)) as T;

function blankProduct(): Product {
  return {
    id: makeId(),
    slug: "mainboard-moi",
    name: "Mainboard mới",
    brand: "",
    category: "Mainboard",
    description: "",
    status: "draft",
    spec: { ...specTemplates.Mainboard },
    media: {},
    hotspots: [],
    components: [],
  };
}

function blankComponent(type: CatalogComponentType): CatalogComponent {
  return {
    id: makeId(),
    type,
    category: type === "SSD" ? "Storage" : type,
    name: `${type} mới`,
    brand: "",
    model: "",
    imageUrl: "",
    gallery: [],
    description: "",
    spec: { ...specTemplates[type] },
    compatibility: "warning",
    notes: "",
    status: "draft",
  };
}

function statusLabel(status: Product["status"] | CatalogComponent["status"]) {
  return status === "published" ? "Đã xuất bản" : "Bản nháp";
}

function compatibilityLabel(status: AssociatedComponent["compatibility"]) {
  return status === "compatible"
    ? "Tương thích"
    : status === "warning"
      ? "Cần kiểm tra"
      : "Không tương thích";
}

function duplicateSlug(slug: string, products: Product[]) {
  const base = `${slug.trim() || "mainboard-moi"}-ban-sao`;
  const used = new Set(products.map((item) => item.slug));
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function SpecInput({
  type,
  field,
  value,
  onChange,
  onBlur,
}: {
  type: string;
  field: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: (value: string) => void;
}) {
  const options = suggestionsForSpec(type, field);
  const listId = `spec-options-${type}-${field}`.replace(/[^a-z0-9-]/gi, "-");
  return (
    <label>
      {specLabel(field)}
      <input
        list={options.length ? listId : undefined}
        value={value}
        placeholder={options.length ? "Chọn hoặc nhập giá trị khác" : undefined}
        onBlur={(event) => onBlur(event.target.value)}
        onChange={(event) => onChange(event.target.value)}
      />
      {options.length > 0 && (
        <datalist id={listId}>
          {options.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      )}
    </label>
  );
}

export default function StaticAdmin({
  initialProducts,
}: {
  initialProducts: Product[];
}) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState<AdminTab>("Mainboard");
  const [adminView, setAdminView] = useState<AdminView>("editor");
  const [detailDevice, setDetailDevice] = useState<Device | null>(null);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [components, setComponents] = useState<CatalogComponent[]>([]);
  const [product, setProduct] = useState<Product>(() =>
    copy(initialProducts[0] ?? blankProduct()),
  );
  const [component, setComponent] = useState<CatalogComponent>(() =>
    blankComponent("CPU"),
  );
  const [queryText, setQueryText] = useState("");
  const [recordFilter, setRecordFilter] = useState("all");
  const [showTrash, setShowTrash] = useState(false);
  const [trash, setTrash] = useState<Device[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [backup, setBackup] = useState<CatalogBackup | null>(null);
  const [importTarget, setImportTarget] = useState<{
    device: Device;
    type: AdminTab;
  } | null>(null);
  const [restoreMode, setRestoreMode] = useState<"add" | "update">("add");
  const [connected, setConnected] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const original =
    tab === "Mainboard"
      ? products.find((p) => p.id === product.id)
      : components.find((c) => c.id === component.id);
  const dirty =
    JSON.stringify(tab === "Mainboard" ? product : component) !==
    JSON.stringify(original);
  const [selectedHotspot, setSelectedHotspot] = useState<string | null>(null);
  const [draggingHotspot, setDraggingHotspot] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const draggedRef = useRef(false);

  useEffect(() => {
    const online = () => setConnected(navigator.onLine);
    online();
    window.addEventListener("online", online);
    window.addEventListener("offline", online);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", online);
    };
  }, []);
  useEffect(() => {
    const leave = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [dirty]);

  async function previewBackup(file: File) {
    try {
      if (file.size > 10 * 1024 * 1024)
        throw new Error("File backup vượt quá 10 MB.");
      setBackup(parseBackup(JSON.parse(await file.text())));
      setMessage("Đã kiểm tra file. Chọn cách khôi phục và xác nhận bên dưới.");
    } catch (error) {
      setBackup(null);
      setMessage(
        error instanceof Error ? error.message : "File JSON không hợp lệ.",
      );
    }
  }
  async function applyBackup() {
    if (!backup) return;
    if (
      dirty &&
      !window.confirm("Bạn có thay đổi chưa lưu. Tiếp tục khôi phục?")
    )
      return;
    setBusy(true);
    try {
      const incoming =
        restoreMode === "add"
          ? {
              products: backup.products.filter(
                (p) =>
                  !products.some((x) => x.id === p.id) &&
                  !trash.some((x) => "media" in x && x.id === p.id),
              ),
              components: backup.components.filter(
                (c) =>
                  !components.some((x) => x.id === c.id) &&
                  !trash.some((x) => !("media" in x) && x.id === c.id),
              ),
            }
          : backup;
      const merged = [
        ...products,
        ...trash.filter((x): x is Product => "media" in x),
      ]
        .filter((p) => !incoming.products.some((x) => x.id === p.id))
        .concat(incoming.products);
      if (new Set(merged.map((p) => p.slug)).size !== merged.length)
        throw new Error(
          "Slug trùng với dữ liệu hiện có. Hãy sửa file trước khi nhập.",
        );
      await restoreCatalog(incoming);
      await reloadFromFirestore();
      setBackup(null);
      setMessage(
        `Đã khôi phục ${incoming.products.length} mainboard và ${incoming.components.length} linh kiện.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error && !("code" in error)
          ? error.message
          : firestoreErrorMessage(error, "khôi phục", auth.currentUser?.uid),
      );
    } finally {
      setBusy(false);
    }
  }

  const filteredProducts = useMemo(
    () =>
      products.filter(
        (item) =>
          (recordFilter === "all" || item.status === recordFilter) &&
          `${item.name} ${item.brand} ${item.slug}`
            .toLowerCase()
            .includes(queryText.toLowerCase()),
      ),
    [products, queryText, recordFilter],
  );
  const filteredComponents = useMemo(
    () =>
      components.filter(
        (item) =>
          item.type === tab &&
          (recordFilter === "all" || item.status === recordFilter) &&
          `${item.name} ${item.brand} ${item.model}`
            .toLowerCase()
            .includes(queryText.toLowerCase()),
      ),
    [components, queryText, tab, recordFilter],
  );
  const activeHotspot = product.hotspots.find(
    (item) => item.id === selectedHotspot,
  );

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      if (nextUser) void reloadFromFirestore();
    });
  }, []);

  useEffect(() => {
    function handleHotspotDelete(event: KeyboardEvent) {
      if (tab !== "Mainboard" || !selectedHotspot) return;
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      const target = event.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT"
      ) {
        return;
      }
      event.preventDefault();
      setProduct((current) => ({
        ...current,
        hotspots: current.hotspots.filter(
          (item) => item.id !== selectedHotspot,
        ),
      }));
      setSelectedHotspot(null);
      setMessage("Đã xóa hotspot. Hãy lưu để cập nhật Firestore.");
    }

    window.addEventListener("keydown", handleHotspotDelete);
    return () => window.removeEventListener("keydown", handleHotspotDelete);
  }, [selectedHotspot, tab]);

  async function reloadFromFirestore() {
    setSyncError(false);
    try {
      const [remoteProducts, remoteComponents] = await Promise.all([
        loadAllProducts(),
        loadCatalogComponents(),
      ]);
      setTrash(
        [...remoteProducts, ...remoteComponents].filter(
          (item) => item.deletedAt,
        ),
      );
      const activeProducts = remoteProducts.filter((item) => !item.deletedAt);
      const activeComponents = remoteComponents.filter(
        (item) => !item.deletedAt,
      );
      setProducts(activeProducts);
      setProduct((current) =>
        copy(
          activeProducts.find((item) => item.id === current.id) ??
            activeProducts[0] ??
            blankProduct(),
        ),
      );
      setComponents(activeComponents);
      setComponent((current) =>
        copy(
          activeComponents.find((c) => c.id === current.id) ??
            activeComponents.find((c) => c.type === current.type) ??
            blankComponent(current.type),
        ),
      );
      setLoaded(true);
      setMessage(
        remoteProducts.length
          ? `Đã tải ${remoteProducts.length} mainboard và ${remoteComponents.length} linh kiện.`
          : "Firestore chưa có dữ liệu. Bạn có thể đồng bộ dữ liệu mẫu.",
      );
    } catch (error) {
      setSyncError(true);
      setMessage(firestoreErrorMessage(error, "đọc", auth.currentUser?.uid));
    }
  }

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setPassword("");
      setMessage("Đăng nhập thành công.");
    } catch {
      setMessage("Đăng nhập thất bại. Hãy kiểm tra email và mật khẩu.");
    } finally {
      setBusy(false);
    }
  }

  function updateProduct(patch: Partial<Product>) {
    setProduct((current) => ({ ...current, ...patch }));
  }

  function updateComponentDraft(patch: Partial<CatalogComponent>) {
    setComponent((current) => ({ ...current, ...patch }));
  }

  function updateProductGallery(index: number, value: string) {
    const gallery = [...(product.gallery ?? [])];
    gallery[index] = value;
    updateProduct({ gallery });
  }

  function addProductGalleryField() {
    updateProduct({ gallery: [...(product.gallery ?? []), ""] });
  }

  function removeProductGalleryField(index: number) {
    updateProduct({
      gallery: (product.gallery ?? []).filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    });
  }

  function updateComponentGallery(index: number, value: string) {
    const gallery = [...(component.gallery ?? [])];
    gallery[index] = value;
    updateComponentDraft({ gallery });
  }

  function addComponentGalleryField() {
    updateComponentDraft({ gallery: [...(component.gallery ?? []), ""] });
  }

  function removeComponentGalleryField(index: number) {
    updateComponentDraft({
      gallery: (component.gallery ?? []).filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    });
  }

  async function removeProductById(id: string, name: string) {
    if (!window.confirm("Bạn có chắc muốn xóa “" + name + "” không?")) return;
    setBusy(true);
    try {
      const item = products.find((p) => p.id === id);
      if (!item) return;
      const removed = archive(item, user?.email ?? "Quản trị");
      await saveProduct(removed);
      setTrash((current) => [...current, removed]);
      const next = products.filter((item) => item.id !== id);
      setProducts(next);
      if (product.id === id) setProduct(copy(next[0] ?? blankProduct()));
      setMessage("Đã chuyển mainboard vào thùng rác.");
    } catch (error) {
      setMessage(firestoreErrorMessage(error, "xóa", auth.currentUser?.uid));
    } finally {
      setBusy(false);
    }
  }

  async function removeComponentById(id: string, name: string) {
    if (!window.confirm("Bạn có chắc muốn xóa “" + name + "” không?")) return;
    setBusy(true);
    try {
      const item = components.find((c) => c.id === id);
      if (!item) return;
      const removed = archive(item, user?.email ?? "Quản trị");
      await saveCatalogComponent(removed);
      setTrash((current) => [...current, removed]);
      const next = components.filter((item) => item.id !== id);
      setComponents(next);
      if (component.id === id) {
        const componentType = tab === "Mainboard" ? "CPU" : tab;
        setComponent(
          copy(
            next.find((item) => item.type === componentType) ??
              blankComponent(componentType),
          ),
        );
      }
      setMessage("Đã chuyển linh kiện vào thùng rác.");
    } catch (error) {
      setMessage(firestoreErrorMessage(error, "xóa", auth.currentUser?.uid));
    } finally {
      setBusy(false);
    }
  }

  async function duplicateProduct(item: Product) {
    setBusy(true);
    try {
      const duplicated = {
        ...stamp(
          { ...copy(item), history: [] },
          user?.email ?? "Quản trị",
          "Nhân đôi thiết bị",
        ),
        id: makeId(),
        status: "draft" as const,
        slug: duplicateSlug(item.slug, [
          ...products,
          ...trash.filter((x): x is Product => "media" in x),
        ]),
      };
      await saveProduct(duplicated);
      setProducts((current) => [...current, duplicated]);
      setProduct(copy(duplicated));
      setMessage(`Đã nhân đôi mainboard “${item.name}”.`);
    } catch (error) {
      setMessage(
        firestoreErrorMessage(error, "nhân đôi", auth.currentUser?.uid),
      );
    } finally {
      setBusy(false);
    }
  }

  async function duplicateComponent(item: CatalogComponent) {
    setBusy(true);
    try {
      const duplicated = {
        ...stamp(
          { ...copy(item), history: [] },
          user?.email ?? "Quản trị",
          "Nhân đôi thiết bị",
        ),
        id: makeId(),
        status: "draft" as const,
      };
      await saveCatalogComponent(duplicated);
      setComponents((current) => [...current, duplicated]);
      setComponent(copy(duplicated));
      setMessage(`Đã nhân đôi ${item.type} “${item.name}”.`);
    } catch (error) {
      setMessage(
        firestoreErrorMessage(error, "nhân đôi", auth.currentUser?.uid),
      );
    } finally {
      setBusy(false);
    }
  }

  function downloadBackup() {
    const payload = {
      exportedAt: new Date().toISOString(),
      products: [
        ...products,
        ...trash.filter((i): i is Product => "media" in i),
      ],
      components: [
        ...components,
        ...trash.filter((i): i is CatalogComponent => !("media" in i)),
      ],
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download =
      "tech-explorer-backup-" + new Date().toISOString().slice(0, 10) + ".json";
    link.click();
    URL.revokeObjectURL(url);
    setMessage("Đã tải file backup dữ liệu JSON.");
  }

  async function saveCurrent() {
    if (!connected) {
      setMessage("Đang mất kết nối. Hãy kết nối mạng trước khi lưu.");
      return;
    }
    setBusy(true);
    try {
      const draft = tab === "Mainboard" ? product : component;
      if (
        draft.status === "published" &&
        publishChecks(draft, [
          ...products,
          ...trash.filter((i): i is Product => "media" in i),
        ]).some((check) => !check.valid)
      ) {
        setMessage(
          "Chưa thể xuất bản. Hãy hoàn thành các mục trong Kiểm tra xuất bản.",
        );
        return;
      }
      const urls =
        tab === "Mainboard"
          ? productGallery(product)
          : componentGallery(component);
      if (draft.status === "published")
        for (const url of urls) {
          await new Promise<void>((resolve, reject) => {
            const img = new Image();
            const timer = setTimeout(
              () =>
                reject(new Error("Ảnh tải quá lâu. Hãy kiểm tra đường dẫn.")),
              8000,
            );
            img.onload = () => {
              clearTimeout(timer);
              resolve();
            };
            img.onerror = () => {
              clearTimeout(timer);
              reject(
                new Error(
                  "Không tải được ảnh. Hãy kiểm tra URL trước khi xuất bản.",
                ),
              );
            };
            img.src = assetUrl(url) ?? "";
          });
        }
      if (tab === "Mainboard") {
        if (
          [
            ...products,
            ...trash.filter((x): x is Product => "media" in x),
          ].some((p) => p.id !== product.id && p.slug === product.slug)
        ) {
          setMessage(
            "Đường dẫn đã tồn tại, kể cả trong thùng rác. Hãy chọn slug khác.",
          );
          return;
        }
        if (!product.name.trim() || !product.slug.trim()) {
          setMessage("Vui lòng nhập tên và slug cho mainboard.");
          return;
        }
        const saved = {
          ...stamp(product, user?.email ?? "Quản trị"),
          spec: normalizeSpecs(product.spec),
          components: product.components.map((entry) =>
            entry.catalogId
              ? entry
              : components.some(
                    (x) => x.id === entry.id && x.category === entry.category,
                  )
                ? { ...entry, catalogId: entry.id }
                : entry,
          ),
          gallery: (product.gallery ?? [])
            .map((url) => url.trim())
            .filter(Boolean),
        };
        if (
          saved.status === "published" &&
          saved.components.some(
            (entry) =>
              entry.catalogId &&
              !components.some(
                (x) =>
                  x.id === entry.catalogId &&
                  x.status === "published" &&
                  !x.deletedAt,
              ),
          )
        )
          throw Error(
            "Linh kiện liên kết chưa xuất bản hoặc đã bị xóa. Hãy xuất bản linh kiện đó hoặc bỏ liên kết trước khi xuất bản mainboard.",
          );
        await saveVersionedDevice(saved, original);
        setProducts((current) =>
          current.some((item) => item.id === saved.id)
            ? current.map((item) => (item.id === saved.id ? saved : item))
            : [...current, saved],
        );
        setProduct(copy(saved));
        setMessage("Đã lưu mainboard lên Firestore.");
      } else {
        if (!component.name.trim()) {
          setMessage("Vui lòng nhập tên linh kiện.");
          return;
        }
        const saved = {
          ...stamp(component, user?.email ?? "Quản trị"),
          spec: normalizeSpecs(component.spec),
          type: tab,
          gallery: (component.gallery ?? [])
            .map((url) => url.trim())
            .filter(Boolean),
        };
        await saveVersionedDevice(saved, original);
        setComponents((current) =>
          current.some((item) => item.id === saved.id)
            ? current.map((item) => (item.id === saved.id ? saved : item))
            : [...current, saved],
        );
        setComponent(copy(saved));
        setMessage(`Đã lưu ${tab} lên Firestore.`);
      }
    } catch (error) {
      setMessage(
        error instanceof Error && !("code" in error)
          ? error.message
          : firestoreErrorMessage(error, "lưu", auth.currentUser?.uid),
      );
    } finally {
      setBusy(false);
    }
  }

  async function seedFirestore() {
    if (
      dirty &&
      !window.confirm("Bạn có thay đổi chưa lưu. Tiếp tục đồng bộ dữ liệu mẫu?")
    )
      return;
    setBusy(true);
    try {
      const result = await seedProductsToFirestore(
        initialProducts,
        seedCatalogComponents,
      );
      await reloadFromFirestore();
      setMessage(
        `Đã đồng bộ ${result.products} mainboard và ${result.components} linh kiện mẫu lên Firestore.`,
      );
    } catch (error) {
      setMessage(
        firestoreErrorMessage(error, "đồng bộ", auth.currentUser?.uid),
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeCurrent() {
    if (tab === "Mainboard") {
      await removeProductById(product.id, product.name);
    } else {
      await removeComponentById(component.id, component.name);
    }
  }

  async function trashAction(item: Device, permanent: boolean) {
    if (
      dirty &&
      !window.confirm(
        "Có thay đổi chưa lưu. Bỏ thay đổi để cập nhật dữ liệu từ thùng rác?",
      )
    )
      return;
    if (
      permanent &&
      !window.confirm(`Xóa vĩnh viễn “${item.name}”? Không thể hoàn tác.`)
    )
      return;
    setBusy(true);
    try {
      if (permanent) {
        if ("media" in item) await deleteProduct(item.id);
        else await deleteCatalogComponent(item.id);
      } else {
        const restored = unarchive(item, user?.email ?? "Quản trị");
        if ("media" in restored) await saveProduct(restored);
        else await saveCatalogComponent(restored);
      }
      await reloadFromFirestore();
      setMessage(
        permanent ? "Đã xóa vĩnh viễn." : "Đã khôi phục thành bản nháp.",
      );
    } catch (error) {
      setMessage(
        firestoreErrorMessage(error, "khôi phục/xóa", auth.currentUser?.uid),
      );
    } finally {
      setBusy(false);
    }
  }
  function updateImages(images: string[]) {
    if (tab === "Mainboard")
      updateProduct({
        media: {
          ...product.media,
          top: images[0] ?? "",
          main: images[0] ?? "",
        },
        gallery: images.slice(1),
      });
    else
      updateComponentDraft({
        imageUrl: images[0] ?? "",
        gallery: images.slice(1),
      });
  }

  function chooseTab(nextTab: AdminTab) {
    setAdminView("editor");
    setShowTrash(false);
    setTab(nextTab);
    setQueryText("");
    setSelectedHotspot(null);
    if (nextTab !== "Mainboard") {
      setComponent(
        copy(
          components.find((item) => item.type === nextTab) ??
            blankComponent(nextTab),
        ),
      );
    }
  }

  function openDevice(item: Device) {
    if (
      dirty &&
      !window.confirm("Có thay đổi chưa lưu. Bạn có muốn bỏ các thay đổi này?")
    )
      return;
    if ("media" in item) {
      setTab("Mainboard");
      setProduct(copy(item));
    } else {
      setTab(item.type);
      setComponent(copy(item));
    }
    setShowTrash(false);
    setSelectedHotspot(null);
    setAdminView("editor");
  }

  function viewDevice(item: Device) {
    setDetailDevice(copy(item));
    setAdminView("detail");
  }

  function backToProductList() {
    setDetailDevice(null);
    setAdminView("list");
  }

  function addDevice(type: Exclude<AdminTab, never>) {
    if (type === "Mainboard") {
      setTab("Mainboard");
      setProduct(blankProduct());
    } else {
      setTab(type);
      setComponent(blankComponent(type));
    }
    setShowTrash(false);
    setSelectedHotspot(null);
    setAdminView("editor");
  }

  function addHotspot(event: React.MouseEvent<HTMLDivElement>) {
    if (draggedRef.current || !product.media.top || !boardRef.current) {
      draggedRef.current = false;
      return;
    }
    const rect = boardRef.current.getBoundingClientRect();
    const hotspot: Hotspot = {
      id: makeId(),
      type: "component",
      view: "top",
      x: Math.round(((event.clientX - rect.left) / rect.width) * 10000) / 100,
      y: Math.round(((event.clientY - rect.top) / rect.height) * 10000) / 100,
      title: "Linh kiện mới",
      subtitle: "",
      description: "",
    };
    updateProduct({ hotspots: [...product.hotspots, hotspot] });
    setSelectedHotspot(hotspot.id);
  }

  function moveHotspot(event: React.PointerEvent<HTMLButtonElement>) {
    event.stopPropagation();
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedHotspot(event.currentTarget.dataset.hotspot ?? null);
    setDraggingHotspot(event.currentTarget.dataset.hotspot ?? null);
  }

  function updateDraggedHotspot(event: React.PointerEvent<HTMLDivElement>) {
    if (!draggingHotspot || !boardRef.current) return;
    draggedRef.current = true;
    const rect = boardRef.current.getBoundingClientRect();
    const x = Math.max(
      0,
      Math.min(100, ((event.clientX - rect.left) / rect.width) * 100),
    );
    const y = Math.max(
      0,
      Math.min(100, ((event.clientY - rect.top) / rect.height) * 100),
    );
    updateProduct({
      hotspots: product.hotspots.map((item) =>
        item.id === draggingHotspot
          ? {
              ...item,
              x: Math.round(x * 100) / 100,
              y: Math.round(y * 100) / 100,
            }
          : item,
      ),
    });
  }

  function finishDragging() {
    setDraggingHotspot(null);
  }

  function updateHotspot(patch: Partial<Hotspot>) {
    updateProduct({
      hotspots: product.hotspots.map((item) =>
        item.id === selectedHotspot ? { ...item, ...patch } : item,
      ),
    });
  }

  function addAssociatedComponent() {
    updateProduct({
      components: [
        ...product.components,
        {
          id: makeId(),
          category: "CPU",
          name: "Linh kiện mới",
          model: "Mã sản phẩm",
          compatibility: "warning",
          notes: "",
        },
      ],
    });
  }

  if (user === undefined) {
    return <main className="empty">Đang kiểm tra đăng nhập…</main>;
  }

  if (!user) {
    return (
      <main className="admin-shell static-admin admin-login">
        <div className="admin-login-card">
          <span className="eyebrow">TECH EXPLORER / FIRESTORE</span>
          <h1>Đăng nhập quản trị</h1>
          <p>
            Đăng nhập bằng tài khoản Firebase có quyền quản trị để chỉnh sửa dữ
            liệu.
          </p>
          <form onSubmit={login}>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label>
              Mật khẩu
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            <button className="primary" disabled={busy}>
              Đăng nhập
            </button>
          </form>
          {message && (
            <div className="admin-message" role="status">
              {message}
            </div>
          )}
          <a href={`${basePath}/`}>← Về trang Explorer</a>
        </div>
      </main>
    );
  }

  const activeItems =
    tab === "Mainboard" ? filteredProducts : filteredComponents;

  return (
    <main
      className="admin-shell static-admin"
      onClickCapture={(event) => {
        const target = event.target as HTMLElement;
        if (
          busy &&
          target.closest(
            ".admin-card, .admin-product-card, .add-record, .admin-tabs button, .admin-header-actions a, .admin-header-actions button",
          )
        ) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        if (
          dirty &&
          target.closest(
            ".admin-card, .admin-card-duplicate, .admin-product-card, .add-record, .admin-tabs button, .admin-header-actions a, .admin-header-actions button",
          ) &&
          !window.confirm(
            "Có thay đổi chưa lưu. Bạn có muốn bỏ các thay đổi này?",
          )
        ) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      <div className="admin-header">
        <div>
          <span className="eyebrow">TECH EXPLORER / FIRESTORE</span>
          <h1>Quản lý phần cứng</h1>
          <p className="admin-title-note">
            Quản lý mainboard, CPU, RAM, SSD, GPU và PSU trong Firestore.
          </p>
        </div>
        <div className="admin-header-actions">
          <span className="admin-user">{user.email}</span>
          <button
            className={`admin-header-nav ${adminView === "list" || adminView === "detail" ? "active" : ""}`}
            onClick={() => setAdminView("list")}
          >
            <ListIcon size={16} /> Danh sách
          </button>
          <button
            className={`admin-header-nav admin-settings-icon ${adminView === "settings" ? "active" : ""}`}
            aria-label="Mở cài đặt"
            title="Cài đặt"
            onClick={() => setAdminView("settings")}
          >
            <SettingsIcon size={18} />
          </button>
          <button onClick={() => void signOut(auth)}>Đăng xuất</button>
          <a href={`${basePath}/`}>← Về Explorer</a>
        </div>
      </div>
      <div className="admin-editor-view" hidden={adminView !== "editor"}>
      <div className="admin-toolbar">
        {importTarget && (
          <ProductImport
            device={importTarget.device}
            type={importTarget.type}
            onClose={() => setImportTarget(null)}
            onApply={(next) => {
              if ("media" in next) setProduct(next);
              else setComponent(next);
              setMessage(
                "Đã áp dụng vào bản nháp. Kiểm tra rồi bấm Lưu lên Firestore.",
              );
            }}
          />
        )}
        <nav className="admin-tabs" aria-label="Danh mục phần cứng">
          {tabs.map((item) => (
            <button
              key={item}
              className={tab === item ? "active" : ""}
              onClick={() => chooseTab(item)}
            >
              {item}
            </button>
          ))}
        </nav>
        <div className="admin-toolbar-actions">
          <button
            disabled={busy}
            onClick={() =>
              setImportTarget({
                device: copy(tab === "Mainboard" ? product : component),
                type: tab,
              })
            }
          >
            Nhập JSON/CSV
          </button>
          <span role="status">
            {!connected
              ? "Mất kết nối"
              : syncError
                ? "Lỗi đồng bộ"
                : busy
                  ? "Đang đồng bộ…"
                  : !loaded
                    ? "Đang tải dữ liệu…"
                    : dirty
                      ? "Có thay đổi chưa lưu"
                      : "Đã đồng bộ"}
          </span>
          {syncError && (
            <button
              disabled={busy}
              onClick={() => {
                if (
                  !dirty ||
                  window.confirm("Bỏ thay đổi chưa lưu để tải lại dữ liệu?")
                )
                  void reloadFromFirestore();
              }}
            >
              Thử tải lại
            </button>
          )}
          <button disabled={busy} onClick={() => void seedFirestore()}>
            ↥ Đồng bộ dữ liệu mẫu
          </button>
          <button
            className="primary"
            disabled={busy}
            onClick={() => void saveCurrent()}
          >
            ✓ Lưu lên Firestore
          </button>
        </div>
      </div>
      {message && (
        <div className="admin-message" role="status">
          {message}
        </div>
      )}
      {loaded && user && (
        <AdminRecovery
          uid={user.uid}
          disabled={busy}
          item={tab === "Mainboard" ? product : component}
          dirty={dirty}
          onRecover={(item) => {
            setTab("media" in item ? "Mainboard" : item.type);
            if ("media" in item) setProduct(copy(item));
            else setComponent(copy(item));
            setShowTrash(false);
            setSelectedHotspot(null);
          }}
        />
      )}
      {showTrash && (
        <section className="backup-preview">
          <div className="section-heading">
            <h2>Thùng rác ({trash.length})</h2>
            <button onClick={() => setShowTrash(false)}>Đóng</button>
          </div>
          {trash.length === 0 ? (
            <p>Thùng rác trống.</p>
          ) : (
            trash.map((item) => (
              <div key={item.id} className="trash-row">
                <span>
                  <strong>{item.name}</strong>
                  <small>
                    {item.deletedAt
                      ? new Date(item.deletedAt).toLocaleString("vi-VN")
                      : ""}
                  </small>
                </span>
                <button
                  disabled={busy}
                  onClick={() => void trashAction(item, false)}
                >
                  Khôi phục
                </button>
                <button
                  className="danger"
                  disabled={busy}
                  onClick={() => void trashAction(item, true)}
                >
                  Xóa vĩnh viễn
                </button>
              </div>
            ))
          )}
        </section>
      )}
      <div className="admin-workspace" inert={busy}>
        <aside className="admin-list-panel">
          <div className="admin-list-heading">
            <h2>Danh sách {tab === "Mainboard" ? "mainboard" : tab}</h2>
            <span>{activeItems.length} mục</span>
          </div>
          <label className="admin-status-filter">
            Trạng thái
            <select
              value={recordFilter}
              onChange={(e) => setRecordFilter(e.target.value)}
            >
              <option value="all">Tất cả</option>
              <option value="published">Đã xuất bản</option>
              <option value="draft">Bản nháp</option>
            </select>
          </label>
          <input
            aria-label="Tìm dữ liệu"
            placeholder="Tìm theo tên, hãng…"
            value={queryText}
            onChange={(event) => setQueryText(event.target.value)}
          />
          <div className="admin-cards">
            {tab === "Mainboard"
              ? filteredProducts.map((item) => (
                  <div className="admin-card-row" key={item.id}>
                    <button
                      type="button"
                      className={`admin-card ${product.id === item.id ? "selected" : ""}`}
                      onClick={() => setProduct(copy(item))}
                    >
                      <img
                        className="admin-card-image"
                        src={assetUrl(item.media.top)}
                        alt=""
                      />
                      <strong>{item.name}</strong>
                      <span>
                        {item.brand} · {item.spec.Socket ?? "Chưa có socket"}
                      </span>
                      <em>{statusLabel(item.status)}</em>
                      <small>
                        Cập nhật:{" "}
                        {item.updatedAt
                          ? new Date(item.updatedAt).toLocaleDateString("vi-VN")
                          : "Chưa có"}
                      </small>
                    </button>
                    <button
                      type="button"
                      className="admin-card-duplicate"
                      aria-label={"Nhân đôi " + item.name}
                      title="Nhân đôi thiết bị"
                      disabled={busy}
                      onClick={() => void duplicateProduct(item)}
                    >
                      <CopyIcon size={16} />
                    </button>
                    <button
                      type="button"
                      className="admin-card-delete"
                      aria-label={"Xóa " + item.name}
                      title="Chuyển vào thùng rác"
                      disabled={busy}
                      onClick={() => void removeProductById(item.id, item.name)}
                    >
                      <CircleX size={19} />
                    </button>
                  </div>
                ))
              : filteredComponents.map((item) => (
                  <div className="admin-card-row" key={item.id}>
                    <button
                      type="button"
                      className={`admin-card ${component.id === item.id ? "selected" : ""}`}
                      onClick={() => setComponent(copy(item))}
                    >
                      <img
                        className="admin-card-image"
                        src={assetUrl(item.imageUrl)}
                        alt=""
                      />
                      <strong>{item.name}</strong>
                      <span>
                        {item.brand || "Chưa có hãng"} ·{" "}
                        {item.model || "Chưa có mã"}
                      </span>
                      <em>{statusLabel(item.status)}</em>
                      <small>
                        Cập nhật:{" "}
                        {item.updatedAt
                          ? new Date(item.updatedAt).toLocaleDateString("vi-VN")
                          : "Chưa có"}
                      </small>
                    </button>
                    <button
                      type="button"
                      className="admin-card-duplicate"
                      aria-label={"Nhân đôi " + item.name}
                      title="Nhân đôi thiết bị"
                      disabled={busy}
                      onClick={() => void duplicateComponent(item)}
                    >
                      <CopyIcon size={16} />
                    </button>
                    <button
                      type="button"
                      className="admin-card-delete"
                      aria-label={"Xóa " + item.name}
                      title="Chuyển vào thùng rác"
                      disabled={busy}
                      onClick={() =>
                        void removeComponentById(item.id, item.name)
                      }
                    >
                      <CircleX size={19} />
                    </button>
                  </div>
                ))}
            {!activeItems.length && (
              <p className="muted">
                Chưa có dữ liệu. Hãy đồng bộ mẫu hoặc thêm mới.
              </p>
            )}
          </div>
          <button
            className="add-record"
            onClick={() =>
              tab === "Mainboard"
                ? setProduct(blankProduct())
                : setComponent(blankComponent(tab))
            }
          >
            ＋ Thêm {tab === "Mainboard" ? "mainboard" : tab}
          </button>
          <button
            className="add-record"
            onClick={() => setShowTrash((v) => !v)}
          >
            ♲ Thùng rác ({trash.length})
          </button>
        </aside>

        {tab === "Mainboard" ? (
          <section className="admin-form">
            <div className="admin-section-heading">
              <h2>Thông tin mainboard</h2>
              <span>ID: {product.id}</span>
            </div>
            <div className="admin-form-grid">
              <label>
                Tên sản phẩm
                <input
                  value={product.name}
                  onChange={(event) =>
                    updateProduct({ name: event.target.value })
                  }
                />
              </label>
              <label>
                Thương hiệu
                <input
                  value={product.brand}
                  onChange={(event) =>
                    updateProduct({ brand: event.target.value })
                  }
                />
              </label>
              <label>
                Đường dẫn (slug)
                <input
                  value={product.slug}
                  onChange={(event) =>
                    updateProduct({ slug: event.target.value })
                  }
                />
              </label>
              <label>
                Trạng thái
                <select
                  value={product.status}
                  onChange={(event) =>
                    updateProduct({
                      status: event.target.value as Product["status"],
                    })
                  }
                >
                  <option value="published">Đã xuất bản</option>
                  <option value="draft">Bản nháp</option>
                </select>
              </label>
              <label className="wide">
                Mô tả
                <textarea
                  value={product.description}
                  onChange={(event) =>
                    updateProduct({ description: event.target.value })
                  }
                />
              </label>
            </div>
            <details className="admin-collapsible">
              <summary>Thông số kỹ thuật</summary>
              <div className="admin-collapsible-body">
                <div className="admin-form-grid">
                  {Object.entries({
                    ...specTemplates.Mainboard,
                    ...product.spec,
                  }).map(([key, value]) => (
                    <SpecInput
                      key={key}
                      type="Mainboard"
                      field={key}
                      value={value}
                      onBlur={(next) =>
                        updateProduct({
                          spec: {
                            ...product.spec,
                            [key]: normalizeSpecValue(key, next),
                          },
                        })
                      }
                      onChange={(next) =>
                        updateProduct({
                          spec: { ...product.spec, [key]: next },
                        })
                      }
                    />
                  ))}
                </div>
                <button
                  onClick={() => {
                    const key = window.prompt("Tên thông số mới");
                    if (key?.trim())
                      updateProduct({
                        spec: { ...product.spec, [key.trim()]: "" },
                      });
                  }}
                >
                  ＋ Thêm thông số
                </button>
              </div>
            </details>
            <details className="admin-collapsible">
              <summary>Linh kiện đi kèm</summary>
              <div className="admin-collapsible-body">
                <label>
                  Thêm từ thư viện linh kiện
                  <select
                    aria-label="Thêm từ thư viện linh kiện"
                    value=""
                    onChange={(event) => {
                      const source = components.find(
                        (x) => x.id === event.target.value,
                      );
                      if (source)
                        updateProduct({
                          components: [
                            ...product.components,
                            linkComponent(source),
                          ],
                        });
                    }}
                  >
                    <option value="">Chọn linh kiện đã lưu…</option>
                    {components
                      .filter(
                        (x) =>
                          !x.deletedAt &&
                          !product.components.some(
                            (entry) =>
                              entry.catalogId === x.id || entry.id === x.id,
                          ),
                      )
                      .map((source) => (
                        <option key={source.id} value={source.id}>
                          {source.type} · {source.name} ·{" "}
                          {statusLabel(source.status)}
                        </option>
                      ))}
                  </select>
                </label>
                <p className="muted">
                  Thông tin của linh kiện liên kết được lấy từ thư viện. Xuất
                  bản linh kiện trước khi xuất bản mainboard có liên kết đó.
                </p>
                {product.components.map((item) => (
                  <div className="associated-component" key={item.id}>
                    <div className="associated-component-heading">
                      <strong>{categoryLabel(item.category)}</strong>
                      <button
                        className="danger"
                        onClick={() =>
                          updateProduct({
                            components: product.components.filter(
                              (entry) => entry.id !== item.id,
                            ),
                          })
                        }
                      >
                        Xóa
                      </button>
                    </div>
                    <label>
                      Loại
                      <select
                        value={item.category}
                        onChange={(event) =>
                          updateProduct({
                            components: product.components.map((entry) =>
                              entry.id === item.id
                                ? {
                                    ...entry,
                                    catalogId: undefined,
                                    category: event.target
                                      .value as AssociatedComponent["category"],
                                  }
                                : entry,
                            ),
                          })
                        }
                      >
                        {[
                          "CPU",
                          "RAM",
                          "GPU",
                          "Storage",
                          "PSU",
                          "Cooling",
                          "Case",
                          "Other",
                        ].map((value) => (
                          <option key={value} value={value}>
                            {categoryLabel(value)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Liên kết thư viện
                      <select
                        aria-label={`Liên kết thư viện ${item.id}`}
                        value={item.catalogId ?? ""}
                        onChange={(event) => {
                          const source = components.find(
                            (x) => x.id === event.target.value,
                          );
                          updateProduct({
                            components: product.components.map((entry) =>
                              entry.id !== item.id
                                ? entry
                                : source
                                  ? {
                                      ...entry,
                                      catalogId: source.id,
                                      category: source.category,
                                      name: source.name,
                                      model: source.model,
                                    }
                                  : { ...entry, catalogId: undefined },
                            ),
                          });
                        }}
                      >
                        <option value="">Nhập thông tin riêng</option>
                        {components
                          .filter(
                            (x) => x.category === item.category && !x.deletedAt,
                          )
                          .map((source) => (
                            <option key={source.id} value={source.id}>
                              {source.name} · {statusLabel(source.status)}
                            </option>
                          ))}
                        {item.catalogId &&
                          !components.some((x) => x.id === item.catalogId) && (
                            <option value={item.catalogId}>
                              Liên kết không còn khả dụng
                            </option>
                          )}
                      </select>
                    </label>
                    <label>
                      Tên
                      <input
                        value={
                          components.find((x) => x.id === item.catalogId)
                            ?.name ?? item.name
                        }
                        readOnly={!!item.catalogId}
                        onChange={(event) =>
                          updateProduct({
                            components: product.components.map((entry) =>
                              entry.id === item.id
                                ? { ...entry, name: event.target.value }
                                : entry,
                            ),
                          })
                        }
                      />
                    </label>
                    <label>
                      Mã sản phẩm
                      <input
                        value={
                          components.find((x) => x.id === item.catalogId)
                            ?.model ?? item.model
                        }
                        readOnly={!!item.catalogId}
                        onChange={(event) =>
                          updateProduct({
                            components: product.components.map((entry) =>
                              entry.id === item.id
                                ? { ...entry, model: event.target.value }
                                : entry,
                            ),
                          })
                        }
                      />
                    </label>
                    <label>
                      Trạng thái
                      <select
                        value={item.compatibility}
                        onChange={(event) =>
                          updateProduct({
                            components: product.components.map((entry) =>
                              entry.id === item.id
                                ? {
                                    ...entry,
                                    compatibility: event.target
                                      .value as AssociatedComponent["compatibility"],
                                  }
                                : entry,
                            ),
                          })
                        }
                      >
                        {statuses.map((value) => (
                          <option key={value} value={value}>
                            {compatibilityLabel(value)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ))}
                <button onClick={addAssociatedComponent}>
                  ＋ Thêm linh kiện đi kèm
                </button>
              </div>
            </details>
            <details className="admin-collapsible">
              <summary>Ảnh mặt trước</summary>
              <div className="admin-collapsible-body">
                <label>
                  Link ảnh
                  <ImageReferenceInput
                    value={product.media.top ?? ""}
                    placeholder="https://… hoặc /media/…"
                    onChange={(event) =>
                      updateProduct({
                        media: {
                          ...product.media,
                          top: event.target.value,
                          main: event.target.value,
                        },
                      })
                    }
                  />
                </label>
                {(product.gallery ?? []).length > 0 && (
                  <div className="admin-gallery-fields">
                    {(product.gallery ?? []).map((url, index) => (
                      <div className="admin-gallery-field" key={index}>
                        <label>
                          <span>Thumbnail {index + 1}</span>
                          <ImageReferenceInput
                            type="url"
                            value={url}
                            placeholder="https://… hoặc /media/…"
                            onChange={(event) =>
                              updateProductGallery(index, event.target.value)
                            }
                          />
                        </label>
                        <button
                          type="button"
                          className="admin-gallery-remove"
                          aria-label={`Xóa thumbnail ${index + 1}`}
                          onClick={() => removeProductGalleryField(index)}
                        >
                          <CircleX size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  className="admin-gallery-add"
                  onClick={addProductGalleryField}
                >
                  <Plus size={16} /> Thêm thumbnail
                </button>
              </div>
            </details>
            <div className="admin-actions">
              <button
                className="primary"
                disabled={busy}
                onClick={() => void saveCurrent()}
              >
                Lưu thay đổi
              </button>
              <button
                className="danger"
                disabled={busy}
                onClick={() => void removeCurrent()}
              >
                Xóa
              </button>
            </div>
          </section>
        ) : (
          <section className="admin-form">
            <div className="admin-section-heading">
              <h2>Thông tin {tab}</h2>
              <span>ID: {component.id}</span>
            </div>
            <div className="admin-form-grid">
              <label>
                Tên linh kiện
                <input
                  value={component.name}
                  onChange={(event) =>
                    updateComponentDraft({ name: event.target.value })
                  }
                />
              </label>
              <label>
                Thương hiệu
                <input
                  value={component.brand}
                  onChange={(event) =>
                    updateComponentDraft({ brand: event.target.value })
                  }
                />
              </label>
              <label>
                Mã sản phẩm
                <input
                  value={component.model}
                  onChange={(event) =>
                    updateComponentDraft({ model: event.target.value })
                  }
                />
              </label>
              <label>
                Trạng thái
                <select
                  value={component.status}
                  onChange={(event) =>
                    updateComponentDraft({
                      status: event.target.value as CatalogComponent["status"],
                    })
                  }
                >
                  <option value="published">Đã xuất bản</option>
                  <option value="draft">Bản nháp</option>
                </select>
              </label>
              <label className="wide">
                Link ảnh linh kiện
                <ImageReferenceInput
                  type="url"
                  value={component.imageUrl ?? ""}
                  placeholder="https://… hoặc /media/…"
                  onChange={(event) =>
                    updateComponentDraft({ imageUrl: event.target.value })
                  }
                />
              </label>
              {(component.gallery ?? []).length > 0 && (
                <div className="admin-gallery-fields wide">
                  {(component.gallery ?? []).map((url, index) => (
                    <div className="admin-gallery-field" key={index}>
                      <label>
                        <span>Thumbnail {index + 1}</span>
                        <ImageReferenceInput
                          type="url"
                          value={url}
                          placeholder="https://… hoặc /media/…"
                          onChange={(event) =>
                            updateComponentGallery(index, event.target.value)
                          }
                        />
                      </label>
                      <button
                        type="button"
                        className="admin-gallery-remove"
                        aria-label={`Xóa thumbnail ${index + 1}`}
                        onClick={() => removeComponentGalleryField(index)}
                      >
                        <CircleX size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                className="admin-gallery-add wide"
                onClick={addComponentGalleryField}
              >
                <Plus size={16} /> Thêm thumbnail
              </button>
              <label className="wide">
                Mô tả
                <textarea
                  value={component.description}
                  onChange={(event) =>
                    updateComponentDraft({ description: event.target.value })
                  }
                />
              </label>
              <label className="wide">
                Ghi chú tương thích
                <textarea
                  value={component.notes}
                  onChange={(event) =>
                    updateComponentDraft({ notes: event.target.value })
                  }
                />
              </label>
            </div>
            <details className="admin-collapsible">
              <summary>Thông số {tab}</summary>
              <div className="admin-collapsible-body">
                <div className="admin-form-grid">
                  {Object.entries({
                    ...specTemplates[tab],
                    ...component.spec,
                  }).map(([key, value]) => (
                    <SpecInput
                      key={key}
                      type={tab}
                      field={key}
                      value={value}
                      onBlur={(next) =>
                        updateComponentDraft({
                          spec: {
                            ...component.spec,
                            [key]: normalizeSpecValue(key, next),
                          },
                        })
                      }
                      onChange={(next) =>
                        updateComponentDraft({
                          spec: { ...component.spec, [key]: next },
                        })
                      }
                    />
                  ))}
                </div>
                <button
                  onClick={() => {
                    const key = window.prompt("Tên thông số mới");
                    if (key?.trim())
                      updateComponentDraft({
                        spec: { ...component.spec, [key.trim()]: "" },
                      });
                  }}
                >
                  ＋ Thêm thông số
                </button>
              </div>
            </details>
            <div className="admin-actions">
              <button
                className="primary"
                disabled={busy}
                onClick={() => void saveCurrent()}
              >
                Lưu thay đổi
              </button>
              <button
                className="danger"
                disabled={busy}
                onClick={() => void removeCurrent()}
              >
                Xóa
              </button>
            </div>
          </section>
        )}

        {tab === "Mainboard" && (
          <section className="admin-preview">
            <div className="admin-section-heading">
              <div>
                <h2>Ảnh và hotspot</h2>
                <span>Kéo vòng tròn số để cập nhật tọa độ.</span>
              </div>
              <span>{product.hotspots.length} hotspot</span>
            </div>
            <label>
              Link ảnh mặt trước
              <ImageReferenceInput
                value={product.media.top ?? ""}
                placeholder="https://… hoặc /media/…"
                onChange={(event) =>
                  updateProduct({
                    media: {
                      ...product.media,
                      top: event.target.value,
                      main: event.target.value,
                    },
                  })
                }
              />
            </label>
            <div
              ref={boardRef}
              className="editor-board"
              onClick={addHotspot}
              onPointerMove={updateDraggedHotspot}
              onPointerUp={finishDragging}
              onPointerLeave={finishDragging}
            >
              {product.media.top ? (
                <img
                  src={assetUrl(product.media.top)}
                  alt="Ảnh mainboard xem trước"
                />
              ) : (
                <p>Nhập URL ảnh để bắt đầu.</p>
              )}
              {product.hotspots.map((hotspot, index) => (
                <button
                  key={hotspot.id}
                  data-hotspot={hotspot.id}
                  className={`editor-node ${selectedHotspot === hotspot.id ? "selected" : ""}`}
                  style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
                  aria-label={`Sửa ${hotspot.title}`}
                  onPointerDown={moveHotspot}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (draggedRef.current) {
                      draggedRef.current = false;
                      return;
                    }
                    setSelectedHotspot(hotspot.id);
                  }}
                >
                  {index + 1}
                </button>
              ))}
            </div>
            <h3>Thư viện ảnh</h3>
            <MediaEditor
              images={productGallery(product)}
              onChange={updateImages}
              onBusy={setBusy}
            />
            <ImageGallery
              images={productGallery(product)}
              alt="Ảnh mainboard xem trước"
              className="admin-gallery-preview"
            />
            {activeHotspot && (
              <div className="editor-fields">
                <label>
                  Tên hotspot
                  <input
                    value={activeHotspot.title}
                    onChange={(event) =>
                      updateHotspot({ title: event.target.value })
                    }
                  />
                </label>
                <label>
                  Phụ đề
                  <input
                    value={activeHotspot.subtitle}
                    onChange={(event) =>
                      updateHotspot({ subtitle: event.target.value })
                    }
                  />
                </label>
                <label className="wide">
                  Mô tả
                  <input
                    value={activeHotspot.description}
                    onChange={(event) =>
                      updateHotspot({ description: event.target.value })
                    }
                  />
                </label>
                <p className="muted">
                  Vị trí: {activeHotspot.x}% / {activeHotspot.y}%
                </p>
                <button
                  className="danger"
                  onClick={() => {
                    updateProduct({
                      hotspots: product.hotspots.filter(
                        (item) => item.id !== selectedHotspot,
                      ),
                    });
                    setSelectedHotspot(null);
                  }}
                >
                  Xóa hotspot
                </button>
              </div>
            )}
            <p className="admin-local-note">
              Bấm “Lưu lên Firestore” để cập nhật ảnh và hotspot trên Explorer.
            </p>
          </section>
        )}
        {tab !== "Mainboard" && (
          <section className="admin-preview admin-component-preview">
            <div className="admin-section-heading">
              <div>
                <h2>Ảnh linh kiện xem trước</h2>
                <span>Ảnh được hiển thị theo URL đã nhập ở biểu mẫu.</span>
              </div>
              <span>{component.type} · không có hotspot</span>
            </div>
            <ComponentCanvas key={component.id} component={component} />
            <MediaEditor
              images={componentGallery(component)}
              onChange={updateImages}
              onBusy={setBusy}
            />
            <p className="admin-local-note">
              Lưu thay đổi để cập nhật ảnh và thông tin linh kiện lên Firestore.
            </p>
          </section>
        )}
        <aside className="admin-validation">
          <h2>Kiểm tra xuất bản</h2>
          {publishChecks(
            tab === "Mainboard" ? product : component,
            products,
          ).map((check) => (
            <div
              className={check.valid ? "check-pass" : "check-missing"}
              key={check.label}
            >
              {check.valid ? "✓" : "!"} {check.label}
              {!check.valid && (
                <button
                  onClick={() => {
                    const section = document.querySelector(".admin-form");
                    section?.scrollIntoView({ behavior: "smooth" });
                    section
                      ?.querySelectorAll("details")
                      .forEach((d) => (d.open = true));
                    const target =
                      check.field === "spec"
                        ? section?.querySelector(".admin-collapsible input")
                        : check.field === "image"
                          ? document.querySelector(".media-dropzone input")
                          : section?.querySelector("input");
                    (target as HTMLElement | null)?.focus();
                  }}
                >
                  Xem mục cần sửa →
                </button>
              )}
            </div>
          ))}
          <h2>Lịch sử chỉnh sửa</h2>
          {loaded && (
            <AdminVersions
              key={(tab === "Mainboard" ? product : component).id}
              item={tab === "Mainboard" ? product : component}
              onRestore={(item) => {
                if (
                  dirty &&
                  !confirm("Có thay đổi chưa lưu. Thay bằng phiên bản đã chọn?")
                )
                  return;
                if ("media" in item) setProduct(copy(item));
                else setComponent(copy(item));
                setMessage(
                  "Đã phục hồi thành bản nháp. Hãy kiểm tra và lưu lên Firestore.",
                );
              }}
            />
          )}
          {tab === "Mainboard" && !product.media.rear_io && (
            <p className="muted">
              Ảnh mặt sau chưa có (tùy chọn, không chặn xuất bản).
            </p>
          )}
          {(tab === "Mainboard" ? product : component).history?.length ? (
            <ol>
              {[...((tab === "Mainboard" ? product : component).history ?? [])]
                .reverse()
                .map((entry, index) => (
                  <li key={index}>
                    <strong>{entry.action}</strong>
                    <small>
                      {new Date(entry.at).toLocaleString("vi-VN")} · {entry.by}
                    </small>
                  </li>
                ))}
            </ol>
          ) : (
            <p className="muted">
              Chưa có lịch sử. Các lần lưu tiếp theo sẽ được ghi lại.
            </p>
          )}
        </aside>
      </div>
      </div>
      {adminView !== "editor" && message && (
        <div className="admin-message" role="status">
          {message}
        </div>
      )}
      {adminView === "list" && (
        <AdminProductList
          products={products}
          components={components}
          onView={viewDevice}
          onEdit={openDevice}
          onDuplicate={(item) => {
            if ("media" in item) void duplicateProduct(item);
            else void duplicateComponent(item);
          }}
          onDelete={(item) => {
            if ("media" in item) void removeProductById(item.id, item.name);
            else void removeComponentById(item.id, item.name);
          }}
          onAdd={addDevice}
          onBack={() => setAdminView("editor")}
        />
      )}
      {adminView === "detail" && detailDevice && (
        <AdminProductDetail
          item={detailDevice}
          onBack={backToProductList}
          onEdit={openDevice}
        />
      )}
      {adminView === "settings" && (
        <section className="admin-settings" aria-labelledby="admin-settings-title">
          <div className="admin-view-heading">
            <div>
              <span className="eyebrow">TECH EXPLORER / CẤU HÌNH</span>
              <h2 id="admin-settings-title">Cài đặt quản lý</h2>
              <p>Backup và khôi phục dữ liệu catalog bằng tệp JSON.</p>
            </div>
            <button className="admin-header-nav" onClick={() => setAdminView("editor")}>
              <ArrowLeft size={16} /> Về trình chỉnh sửa
            </button>
          </div>
          <div className="admin-settings-grid">
            <section className="admin-settings-card">
              <h3><Download size={18} /> Backup dữ liệu</h3>
              <p>
                Tải toàn bộ mainboard, CPU, RAM, SSD, GPU và PSU hiện có, bao
                gồm cả các bản ghi trong thùng rác.
              </p>
              <button disabled={busy || !loaded} onClick={downloadBackup}>
                ↓ Backup JSON
              </button>
            </section>
            <section className="admin-settings-card">
              <h3><Upload size={18} /> Khôi phục dữ liệu</h3>
              <p>
                Chọn file JSON đã backup để kiểm tra trước. Bạn có thể chỉ
                thêm ID mới hoặc cập nhật cả sản phẩm đã tồn tại.
              </p>
              <label className="backup-upload">
                Chọn file JSON
                <input
                  type="file"
                  accept=".json,application/json"
                  disabled={busy || !loaded}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void previewBackup(file);
                    event.target.value = "";
                  }}
                />
              </label>
            </section>
          </div>
          {backup && (
            <section className="backup-preview">
              <h2>Xem trước khôi phục</h2>
              <p>
                {backup.products.length} mainboard · {backup.components.length} linh
                kiện
              </p>
              <ul>
                {[...backup.products, ...backup.components].map((item, index) => (
                  <li key={index}>{item.name} · {statusLabel(item.status)}</li>
                ))}
              </ul>
              <label>
                Cách nhập
                <select
                  value={restoreMode}
                  onChange={(event) =>
                    setRestoreMode(event.target.value as "add" | "update")
                  }
                >
                  <option value="add">Chỉ thêm ID mới, bỏ qua ID đã tồn tại</option>
                  <option value="update">Thêm mới và cập nhật ID đã tồn tại</option>
                </select>
              </label>
              <p>Cập nhật sẽ ghi đè toàn bộ thông tin của sản phẩm có cùng ID.</p>
              <button disabled={busy} onClick={() => void applyBackup()}>
                Xác nhận khôi phục
              </button>
              <button disabled={busy} onClick={() => setBackup(null)}>Hủy</button>
            </section>
          )}
        </section>
      )}
    </main>
  );
}
