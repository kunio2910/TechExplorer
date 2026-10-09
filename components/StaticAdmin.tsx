"use client";
import { useEffect, useMemo, useState } from "react";
import { assetUrl, basePath } from "@/lib/runtime";
import { AssociatedComponent, Hotspot, Product } from "@/lib/types";

const storageKey = "tech-explorer-products-v1";
const categories: AssociatedComponent["category"][] = [
  "CPU",
  "RAM",
  "GPU",
  "Storage",
  "PSU",
  "Cooling",
  "Case",
  "Other",
];
const componentStatuses: AssociatedComponent["compatibility"][] = [
  "compatible",
  "warning",
  "incompatible",
];
const makeId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const blankProduct = (): Product => ({
  id: makeId(),
  slug: "mainboard-moi",
  name: "Mainboard mới",
  brand: "",
  category: "Mainboard",
  description: "",
  status: "published",
  spec: { Chipset: "", Socket: "AM5", "Memory type": "DDR5", PCIe: "" },
  media: {},
  hotspots: [],
  components: [],
});
const copyProduct = (product: Product) =>
  JSON.parse(JSON.stringify(product)) as Product;

export default function StaticAdmin({
  initialProducts,
}: {
  initialProducts: Product[];
}) {
  const [products, setProducts] = useState(initialProducts);
  const [draft, setDraft] = useState<Product>(() =>
    copyProduct(initialProducts[0] ?? blankProduct()),
  );
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [ratio, setRatio] = useState(720 / 950);
  const [selectedHotspot, setSelectedHotspot] = useState<string | null>(null);
  const visibleProducts = useMemo(
    () =>
      products.filter((product) =>
        product.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [products, query],
  );
  const activeHotspot = draft.hotspots.find(
    (hotspot) => hotspot.id === selectedHotspot,
  );

  useEffect(() => {
    try {
      const saved = JSON.parse(
        window.localStorage.getItem(storageKey) ?? "null",
      ) as Product[] | null;
      if (Array.isArray(saved) && saved.length > 0) {
        setProducts(saved);
        setDraft(copyProduct(saved[0]));
      }
    } catch {
      setMessage("Không thể đọc dữ liệu đã lưu trên trình duyệt.");
    }
  }, []);

  function update(patch: Partial<Product>) {
    setDraft((current) => ({ ...current, ...patch }));
  }
  function selectProduct(product: Product) {
    setDraft(copyProduct(product));
    setSelectedHotspot(null);
    setMessage("");
  }
  function saveProduct() {
    if (!draft.name.trim() || !draft.slug.trim()) {
      setMessage("Vui lòng nhập tên và đường dẫn sản phẩm.");
      return;
    }
    const saved = { ...draft, status: "published" as const };
    const next = products.some((product) => product.id === saved.id)
      ? products.map((product) => (product.id === saved.id ? saved : product))
      : [...products, saved];
    setProducts(next);
    setDraft(copyProduct(saved));
    window.localStorage.setItem(storageKey, JSON.stringify(next));
    setMessage("Đã lưu sản phẩm trên trình duyệt này.");
  }
  function addProduct() {
    const product = blankProduct();
    setProducts((current) => [...current, product]);
    setDraft(product);
    setSelectedHotspot(null);
    setMessage("Đã tạo sản phẩm mới. Hãy nhập thông tin rồi bấm Lưu sản phẩm.");
  }
  function deleteProduct() {
    if (!window.confirm(`Xóa ${draft.name}?`)) return;
    const next = products.filter((product) => product.id !== draft.id);
    setProducts(next);
    setDraft(copyProduct(next[0] ?? blankProduct()));
    setSelectedHotspot(null);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
    setMessage("Đã xóa sản phẩm.");
  }
  function updateComponent(id: string, patch: Partial<AssociatedComponent>) {
    update({
      components: draft.components.map((component) =>
        component.id === id ? { ...component, ...patch } : component,
      ),
    });
  }
  function addComponent() {
    update({
      components: [
        ...draft.components,
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
  function addHotspot(event: React.MouseEvent<HTMLDivElement>) {
    if (!draft.media.top) return;
    const rect = event.currentTarget.getBoundingClientRect();
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
    update({ hotspots: [...draft.hotspots, hotspot] });
    setSelectedHotspot(hotspot.id);
  }
  function updateHotspot(patch: Partial<Hotspot>) {
    update({
      hotspots: draft.hotspots.map((hotspot) =>
        hotspot.id === selectedHotspot ? { ...hotspot, ...patch } : hotspot,
      ),
    });
  }

  return (
    <main className="admin-shell static-admin">
      <div className="admin-header">
        <div>
          <span className="eyebrow">TECH EXPLORER / QUẢN LÝ NỘI DUNG</span>
          <h1>Quản lý mainboard</h1>
          <p className="admin-title-note">
            Thêm mainboard, thông số, hotspot và các linh kiện đi kèm.
          </p>
        </div>
        <a href={`${basePath}/`}>← Về trang Explorer</a>
      </div>
      <div className="admin-controls">
        <input
          aria-label="Tìm sản phẩm"
          placeholder="Tìm mainboard…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          aria-label="Chọn sản phẩm"
          value={draft.id}
          onChange={(event) =>
            selectProduct(
              products.find((product) => product.id === event.target.value) ??
                draft,
            )
          }
        >
          {visibleProducts.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>
        <button className="primary" onClick={addProduct}>
          + Thêm mainboard
        </button>
      </div>
      {message && (
        <div className="admin-message" role="status">
          {message}
        </div>
      )}
      <div className="admin-layout">
        <section className="admin-form">
          <h2>Thông tin mainboard</h2>
          {(["name", "slug", "brand", "description"] as const).map((key) => (
            <label key={key}>
              {key === "name"
                ? "Tên sản phẩm"
                : key === "slug"
                  ? "Đường dẫn (slug)"
                  : key === "brand"
                    ? "Thương hiệu"
                    : "Mô tả"}
              {key === "description" ? (
                <textarea
                  value={draft[key]}
                  onChange={(event) => update({ [key]: event.target.value })}
                />
              ) : (
                <input
                  value={draft[key]}
                  onChange={(event) => update({ [key]: event.target.value })}
                />
              )}
            </label>
          ))}
          <label>
            Link thông tin nhà sản xuất
            <input
              value={draft.sourceUrl ?? ""}
              onChange={(event) => update({ sourceUrl: event.target.value })}
            />
          </label>
          <h3>Thông số kỹ thuật</h3>
          {Object.entries(draft.spec).map(([key, value]) => (
            <label key={key}>
              {key}
              <input
                value={value}
                onChange={(event) =>
                  update({ spec: { ...draft.spec, [key]: event.target.value } })
                }
              />
            </label>
          ))}
          <button
            onClick={() => {
              const key = window.prompt("Tên thông số mới");
              if (key?.trim())
                update({ spec: { ...draft.spec, [key.trim()]: "" } });
            }}
          >
            + Thêm thông số
          </button>
          <h3 className="admin-section-title">Linh kiện đi kèm</h3>
          <p className="muted">
            Khai báo CPU, RAM, GPU, ổ lưu trữ và các linh kiện tương thích.
          </p>
          {draft.components.map((component) => (
            <div className="associated-component" key={component.id}>
              <div className="associated-component-heading">
                <strong>{component.category}</strong>
                <button
                  className="danger"
                  onClick={() =>
                    update({
                      components: draft.components.filter(
                        (item) => item.id !== component.id,
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
                  value={component.category}
                  onChange={(event) =>
                    updateComponent(component.id, {
                      category: event.target
                        .value as AssociatedComponent["category"],
                    })
                  }
                >
                  {categories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>
              <label>
                Tên
                <input
                  value={component.name}
                  onChange={(event) =>
                    updateComponent(component.id, { name: event.target.value })
                  }
                />
              </label>
              <label>
                Mã sản phẩm
                <input
                  value={component.model}
                  onChange={(event) =>
                    updateComponent(component.id, { model: event.target.value })
                  }
                />
              </label>
              <label>
                Trạng thái
                <select
                  value={component.compatibility}
                  onChange={(event) =>
                    updateComponent(component.id, {
                      compatibility: event.target
                        .value as AssociatedComponent["compatibility"],
                    })
                  }
                >
                  {componentStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status === "compatible"
                        ? "Tương thích"
                        : status === "warning"
                          ? "Cần kiểm tra"
                          : "Không tương thích"}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Ghi chú
                <input
                  value={component.notes}
                  onChange={(event) =>
                    updateComponent(component.id, { notes: event.target.value })
                  }
                />
              </label>
            </div>
          ))}
          <button onClick={addComponent}>+ Thêm linh kiện đi kèm</button>
          <div className="admin-actions">
            <button className="primary" onClick={saveProduct}>
              Lưu sản phẩm
            </button>
            <button className="danger" onClick={deleteProduct}>
              Xóa sản phẩm
            </button>
          </div>
          <p className="admin-local-note">
            Bản GitHub Pages lưu dữ liệu trên trình duyệt hiện tại. Bản server
            có thể lưu dùng chung qua API và PostgreSQL.
          </p>
        </section>
        <section>
          <div className="editor-wrap">
            <h2>Ảnh và hotspot</h2>
            <p>
              Dán link ảnh mainboard, sau đó click lên ảnh để đặt điểm chú
              thích.
            </p>
            <label>
              Link ảnh mặt trước
              <input
                value={draft.media.top ?? ""}
                placeholder="https://… hoặc /media/…"
                onChange={(event) =>
                  update({
                    media: {
                      ...draft.media,
                      top: event.target.value,
                      main: event.target.value,
                    },
                  })
                }
              />
            </label>
            <div
              className="editor-board"
              style={{ aspectRatio: ratio }}
              onClick={addHotspot}
            >
              {draft.media.top ? (
                <img
                  src={assetUrl(draft.media.top)}
                  alt="Ảnh chỉnh sửa hotspot"
                  onLoad={(event) =>
                    setRatio(
                      event.currentTarget.naturalWidth /
                        event.currentTarget.naturalHeight,
                    )
                  }
                />
              ) : (
                <p>Nhập link ảnh để bắt đầu.</p>
              )}
              {draft.hotspots.map((hotspot, index) => (
                <button
                  key={hotspot.id}
                  className={`editor-node ${selectedHotspot === hotspot.id ? "selected" : ""}`}
                  style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
                  aria-label={`Sửa ${hotspot.title}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedHotspot(hotspot.id);
                  }}
                >
                  {index + 1}
                </button>
              ))}
            </div>
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
                    update({
                      hotspots: draft.hotspots.filter(
                        (hotspot) => hotspot.id !== selectedHotspot,
                      ),
                    });
                    setSelectedHotspot(null);
                  }}
                >
                  Xóa hotspot
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
