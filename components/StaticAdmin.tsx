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
import {
  deleteCatalogComponent,
  deleteProduct,
  loadAllProducts,
  loadCatalogComponents,
  saveCatalogComponent,
  saveProduct,
  seedProductsToFirestore,
  firestoreErrorMessage,
} from "@/lib/firestore";
import type {
  AssociatedComponent,
  CatalogComponent,
  CatalogComponentType,
  Hotspot,
  Product,
} from "@/lib/types";
import { CircleX, Plus } from "lucide-react";
import ComponentCanvas from "./ComponentCanvas";
import ImageGallery from "./ImageGallery";

type AdminTab = "Mainboard" | CatalogComponentType;
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
    spec: { Socket: "AM5", "Memory type": "DDR5" },
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
    spec: {},
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

export default function StaticAdmin({
  initialProducts,
}: {
  initialProducts: Product[];
}) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState<AdminTab>("Mainboard");
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [components, setComponents] = useState<CatalogComponent[]>([]);
  const [product, setProduct] = useState<Product>(() =>
    copy(initialProducts[0] ?? blankProduct()),
  );
  const [component, setComponent] = useState<CatalogComponent>(() =>
    blankComponent("CPU"),
  );
  const [queryText, setQueryText] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedHotspot, setSelectedHotspot] = useState<string | null>(null);
  const [draggingHotspot, setDraggingHotspot] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const draggedRef = useRef(false);

  const filteredProducts = useMemo(
    () =>
      products.filter((item) =>
        `${item.name} ${item.brand} ${item.slug}`
          .toLowerCase()
          .includes(queryText.toLowerCase()),
      ),
    [products, queryText],
  );
  const filteredComponents = useMemo(
    () =>
      components.filter(
        (item) =>
          item.type === tab &&
          `${item.name} ${item.brand} ${item.model}`
            .toLowerCase()
            .includes(queryText.toLowerCase()),
      ),
    [components, queryText, tab],
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

  async function reloadFromFirestore() {
    try {
      const [remoteProducts, remoteComponents] = await Promise.all([
        loadAllProducts(),
        loadCatalogComponents(),
      ]);
      if (remoteProducts.length) {
        setProducts(remoteProducts);
        setProduct((current) =>
          copy(
            remoteProducts.find((item) => item.id === current.id) ??
              remoteProducts[0],
          ),
        );
      }
      setComponents(remoteComponents);
      setMessage(
        remoteProducts.length
          ? `Đã tải ${remoteProducts.length} mainboard và ${remoteComponents.length} linh kiện.`
          : "Firestore chưa có dữ liệu. Bạn có thể đồng bộ dữ liệu mẫu.",
      );
    } catch (error) {
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
      gallery: (product.gallery ?? []).filter((_, itemIndex) => itemIndex !== index),
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
      await deleteProduct(id);
      const next = products.filter((item) => item.id !== id);
      setProducts(next);
      if (product.id === id) setProduct(copy(next[0] ?? blankProduct()));
      setMessage("Đã xóa mainboard trên Firestore.");
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
      await deleteCatalogComponent(id);
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
      setMessage("Đã xóa linh kiện trên Firestore.");
    } catch (error) {
      setMessage(firestoreErrorMessage(error, "xóa", auth.currentUser?.uid));
    } finally {
      setBusy(false);
    }
  }

  function downloadBackup() {
    const payload = {
      exportedAt: new Date().toISOString(),
      products,
      components,
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
    setBusy(true);
    try {
      if (tab === "Mainboard") {
        if (!product.name.trim() || !product.slug.trim()) {
          setMessage("Vui lòng nhập tên và slug cho mainboard.");
          return;
        }
        const saved = {
          ...product,
          gallery: (product.gallery ?? [])
            .map((url) => url.trim())
            .filter(Boolean),
        };
        await saveProduct(saved);
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
          ...component,
          type: tab,
          gallery: (component.gallery ?? [])
            .map((url) => url.trim())
            .filter(Boolean),
        };
        await saveCatalogComponent(saved);
        setComponents((current) =>
          current.some((item) => item.id === saved.id)
            ? current.map((item) => (item.id === saved.id ? saved : item))
            : [...current, saved],
        );
        setComponent(copy(saved));
        setMessage(`Đã lưu ${tab} lên Firestore.`);
      }
    } catch (error) {
      setMessage(firestoreErrorMessage(error, "lưu", auth.currentUser?.uid));
    } finally {
      setBusy(false);
    }
  }

  async function seedFirestore() {
    setBusy(true);
    try {
      const result = await seedProductsToFirestore(initialProducts);
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

  function chooseTab(nextTab: AdminTab) {
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
    <main className="admin-shell static-admin">
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
          <button onClick={() => void signOut(auth)}>Đăng xuất</button>
          <a href={`${basePath}/`}>← Về Explorer</a>
        </div>
      </div>
      <div className="admin-toolbar">
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
          <button disabled={busy} onClick={downloadBackup}>
            ↓ Backup JSON
          </button>
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
      <div className="admin-workspace">
        <aside className="admin-list-panel">
          <div className="admin-list-heading">
            <h2>Danh sách {tab === "Mainboard" ? "mainboard" : tab}</h2>
            <span>{activeItems.length} mục</span>
          </div>
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
                    <strong>{item.name}</strong>
                    <span>
                      {item.brand} · {item.spec.Socket ?? "Chưa có socket"}
                    </span>
                    <em>{statusLabel(item.status)}</em>
                    </button>
                    <button
                      type="button"
                      className="admin-card-delete"
                      aria-label={"Xóa " + item.name}
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
                    <strong>{item.name}</strong>
                    <span>
                      {item.brand || "Chưa có hãng"} · {item.model}
                    </span>
                    <em>{statusLabel(item.status)}</em>
                    </button>
                    <button
                      type="button"
                      className="admin-card-delete"
                      aria-label={"Xóa " + item.name}
                      disabled={busy}
                      onClick={() => void removeComponentById(item.id, item.name)}
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
            <h3>Thông số kỹ thuật</h3>
            <div className="admin-form-grid">
              {Object.entries(product.spec).map(([key, value]) => (
                <label key={key}>
                  {key}
                  <input
                    value={value}
                    onChange={(event) =>
                      updateProduct({
                        spec: { ...product.spec, [key]: event.target.value },
                      })
                    }
                  />
                </label>
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
            <h3>Linh kiện đi kèm</h3>
            {product.components.map((item) => (
              <div className="associated-component" key={item.id}>
                <div className="associated-component-heading">
                  <strong>{item.category}</strong>
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
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Tên
                  <input
                    value={item.name}
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
                    value={item.model}
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
            <h3>Ảnh mặt trước</h3>
            <label>
              Link ảnh
              <input
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
                      <input
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
                <input
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
                        <input
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
            <h3>Thông số {tab}</h3>
            <div className="admin-form-grid">
              {Object.entries(component.spec).map(([key, value]) => (
                <label key={key}>
                  {key}
                  <input
                    value={value}
                    onChange={(event) =>
                      updateComponentDraft({
                        spec: { ...component.spec, [key]: event.target.value },
                      })
                    }
                  />
                </label>
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
              <input
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
            <h3>Image gallery</h3>
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
            <p className="admin-local-note">
              Lưu thay đổi để cập nhật ảnh và thông tin linh kiện lên Firestore.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
