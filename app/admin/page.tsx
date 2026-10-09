"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Product,
  Hotspot,
  mediaRoles,
  MediaRole,
  AssociatedComponent,
} from "@/lib/types";
import DetailPanel from "@/components/DetailPanel";
import DeviceCanvas from "@/components/DeviceCanvas";
const mediaRoleLabels: Record<MediaRole, string> = {
  main: "Ảnh chính",
  top: "Mặt trước",
  angle: "Góc nghiêng",
  rear_io: "Cổng phía sau",
  socket: "Socket CPU",
  ram: "Khe RAM",
  m2: "Khe M.2",
  xray: "Ảnh X-quang",
  exploded: "Ảnh tách lớp",
};
const blank = (): Product => ({
  id: crypto.randomUUID(),
  slug: "new-mainboard",
  name: "Mainboard mới",
  brand: "",
  category: "Mainboard",
  description: "",
  status: "draft",
  spec: { Socket: "AM5", "Memory type": "DDR5" },
  media: {},
  hotspots: [],
  components: [],
});
export default function Admin() {
  const [ratio, setRatio] = useState(720 / 950);
  const [products, setProducts] = useState<Product[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const [token, setToken] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [tab, setTab] = useState("Overview");
  const [role, setRole] = useState<MediaRole>("top");
  async function load() {
    try {
      const response = await fetch("/api/products", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw Error("Không thể tải danh sách sản phẩm.");
      const data: Product[] = await response.json();
      setProducts(data);
      setProduct((p) => p ?? data[0] ?? blank());
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  const active = product?.hotspots.find((h) => h.id === selected);
  function update(patch: Partial<Product>) {
    setProduct((p) => (p ? { ...p, ...patch } : p));
  }
  function updateHotspot(patch: Partial<Hotspot>) {
    if (product && active)
      update({
        hotspots: product.hotspots.map((h) =>
          h.id === active.id ? { ...h, ...patch } : h,
        ),
      });
  }
  function updateComponent(id: string, patch: Partial<AssociatedComponent>) {
    if (product)
      update({
        components: product.components.map((component) =>
          component.id === id ? { ...component, ...patch } : component,
        ),
      });
  }
  async function save(status: "draft" | "published") {
    if (!product) return;
    setBusy(true);
    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...product, status }),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      update({ status });
      setMessage(
        status === "published"
          ? "Đã xuất bản. Mở Explorer để xem sản phẩm."
          : "Đã lưu bản nháp.",
      );
      await load();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(file: File) {
    setBusy(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/media", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      update({
        media: {
          ...product?.media,
          [role]: data.url,
          ...(role === "top" && !product?.media.main ? { main: data.url } : {}),
        },
      });
      setMessage(`Đã tải ảnh ${role}. Hãy lưu sản phẩm để giữ thay đổi.`);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!product || !window.confirm(`Xóa ${product.name}?`)) return;
    setBusy(true);
    try {
      const response = await fetch("/api/products", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: product.id }),
      });
      if (!response.ok) throw Error("Xóa sản phẩm thất bại.");
      setProduct(null);
      await load();
      setMessage("Đã xóa sản phẩm.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="admin-shell">
      <div className="admin-header">
        <div>
          <span className="eyebrow">TECH EXPLORER / QUẢN LÝ NỘI DUNG</span>
          <h1>Quản lý mainboard và hotspot</h1>
          <p className="admin-title-note">
            Thêm mainboard, thông số, hotspot và các linh kiện đi kèm.
          </p>
        </div>
        <Link href="/">← Về Explorer</Link>
      </div>
      <div className="admin-controls">
        <input
          type="password"
          aria-label="Admin token"
          placeholder="Mã quản trị ADMIN_TOKEN"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        <button onClick={load}>Tải danh sách sản phẩm</button>
        <select
          aria-label="Select product"
          value={product?.id ?? ""}
          onChange={(e) => {
            setProduct(products.find((p) => p.id === e.target.value) ?? null);
            setSelected(null);
          }}
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.status === "published" ? "đã xuất bản" : "bản nháp"})
            </option>
          ))}
        </select>
        <button
          className="primary"
          onClick={() => {
            setProduct(blank());
            setSelected(null);
          }}
        >
          + Thêm mainboard
        </button>
      </div>
      {message && (
        <div className="admin-message" role="status">
          {message}
        </div>
      )}
      {product && (
        <div className="admin-layout">
          <section className="admin-form">
            <h2>Thông tin mainboard</h2>
            {(["name", "slug", "brand", "description"] as const).map((k) => (
              <label key={k}>
                {k === "name"
                  ? "Tên sản phẩm"
                  : k === "slug"
                    ? "Đường dẫn (slug)"
                    : k === "brand"
                      ? "Thương hiệu"
                      : "Mô tả"}
                <input
                  value={product[k]}
                  onChange={(e) => update({ [k]: e.target.value })}
                />
              </label>
            ))}
            <p className="muted">
              Loại: Mainboard · Trạng thái:{" "}
              {product.status === "published" ? "đã xuất bản" : "bản nháp"}
            </p>
            <label>
              Link thông tin nhà sản xuất
              <input
                value={product.sourceUrl ?? ""}
                onChange={(e) => update({ sourceUrl: e.target.value })}
              />
            </label>
            <h3>Thông số kỹ thuật</h3>
            {Object.entries(product.spec).map(([k, v]) => (
              <label key={k}>
                {k}
                <input
                  value={v}
                  onChange={(e) =>
                    update({ spec: { ...product.spec, [k]: e.target.value } })
                  }
                />
              </label>
            ))}
            <button
              onClick={() => {
                const key = window.prompt("Tên thông số mới (ví dụ: Chipset)");
                if (key?.trim())
                  update({ spec: { ...product.spec, [key.trim()]: "" } });
              }}
            >
              + Thêm thông số
            </button>
            <h3 style={{ marginTop: 25 }}>Linh kiện đi kèm</h3>
            <p className="muted">
              Khai báo CPU, RAM, GPU, ổ lưu trữ và các linh kiện tương thích.
            </p>
            {product.components.map((component) => (
              <div className="associated-component" key={component.id}>
                <div className="associated-component-heading">
                  <strong>{component.category}</strong>
                  <button
                    className="danger"
                    aria-label={`Xóa ${component.name}`}
                    onClick={() =>
                      update({
                        components: product.components.filter(
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
                    onChange={(e) =>
                      updateComponent(component.id, {
                        category: e.target
                          .value as AssociatedComponent["category"],
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
                    ].map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </label>
                {(["name", "model", "notes"] as const).map((key) => (
                  <label key={key}>
                    {key === "name"
                      ? "Tên"
                      : key === "model"
                        ? "Mã sản phẩm"
                        : "Ghi chú"}
                    <input
                      value={component[key]}
                      onChange={(e) =>
                        updateComponent(component.id, { [key]: e.target.value })
                      }
                    />
                  </label>
                ))}
                <label>
                  Tương thích
                  <select
                    value={component.compatibility}
                    onChange={(e) =>
                      updateComponent(component.id, {
                        compatibility: e.target
                          .value as AssociatedComponent["compatibility"],
                      })
                    }
                  >
                    <option value="compatible">Tương thích</option>
                    <option value="warning">Cần kiểm tra</option>
                    <option value="incompatible">Không tương thích</option>
                  </select>
                </label>
              </div>
            ))}
            <button
              onClick={() =>
                update({
                  components: [
                    ...product.components,
                    {
                      id: crypto.randomUUID(),
                      category: "CPU",
                      name: "Linh kiện mới",
                      model: "Mã sản phẩm",
                      compatibility: "warning",
                      notes: "",
                    },
                  ],
                })
              }
            >
              + Thêm linh kiện đi kèm
            </button>
            <h3 style={{ marginTop: 25 }}>Thư viện hình ảnh</h3>
            <label>
              Vai trò ảnh
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as MediaRole)}
              >
                {mediaRoles.map((r) => (
                  <option key={r} value={r}>
                    {mediaRoleLabels[r]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Link ảnh
              <input
                placeholder="https://… hoặc /uploads/…"
                value={product.media[role] ?? ""}
                onChange={(e) =>
                  update({
                    media: { ...product.media, [role]: e.target.value },
                  })
                }
              />
            </label>
            <label className="upload-row">
              Tải PNG / JPG / WebP / AVIF (tối đa 8 MB)
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/avif"
                disabled={busy}
                onChange={(e) => {
                  if (e.target.files?.[0]) void upload(e.target.files[0]);
                  e.target.value = "";
                }}
              />
            </label>
            <div className="admin-actions">
              <button disabled={busy} onClick={() => save("draft")}>
                Lưu bản nháp
              </button>
              <button
                disabled={busy}
                className="primary"
                onClick={() => save("published")}
              >
                {busy ? "Đang xử lý…" : "Xuất bản"}
              </button>
              <button onClick={() => setPreview((v) => !v)}>Xem trước</button>
              <button disabled={busy} className="danger" onClick={remove}>
                Xóa
              </button>
            </div>
          </section>
          <section>
            <div className="editor-wrap">
              <h2>Đặt hotspot trên ảnh</h2>
              <p>
                Click lên ảnh để tạo điểm. Chọn một điểm để chỉnh nội dung; tọa
                độ được tính tự động.
              </p>
              <label>
                Chế độ chỉnh sửa
                <select
                  value={role === "rear_io" ? "rear_io" : "top"}
                  onChange={(e) => {
                    setRole(e.target.value as MediaRole);
                    setSelected(null);
                  }}
                >
                  <option value="top">Mặt trước / Mainboard</option>
                  <option value="rear_io">Cổng phía sau</option>
                </select>
              </label>
              <div
                className="editor-board"
                style={{ aspectRatio: ratio }}
                onClick={(e) => {
                  if (!product.media[role === "rear_io" ? "rear_io" : "top"])
                    return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const h: Hotspot = {
                    id: crypto.randomUUID(),
                    type: "component",
                    view: role === "rear_io" ? "rear_io" : "top",
                    x:
                      Math.round(
                        ((e.clientX - rect.left) / rect.width) * 10000,
                      ) / 100,
                    y:
                      Math.round(
                        ((e.clientY - rect.top) / rect.height) * 10000,
                      ) / 100,
                    title: "Linh kiện mới",
                    subtitle: "",
                    description: "",
                  };
                  update({ hotspots: [...product.hotspots, h] });
                  setSelected(h.id);
                }}
              >
                {product.media[role === "rear_io" ? "rear_io" : "top"] ? (
                  <img
                    src={product.media[role === "rear_io" ? "rear_io" : "top"]}
                    alt="Hotspot editing canvas"
                    onLoad={(e) =>
                      setRatio(
                        e.currentTarget.naturalWidth /
                          e.currentTarget.naturalHeight,
                      )
                    }
                  />
                ) : (
                  <p>Tải ảnh mặt trước để bắt đầu.</p>
                )}
                {product.hotspots
                  .filter(
                    (h) => h.view === (role === "rear_io" ? "rear_io" : "top"),
                  )
                  .map((h, i) => (
                    <button
                      key={h.id}
                      className={
                        "editor-node " + (selected === h.id ? "selected" : "")
                      }
                      style={{ left: `${h.x}%`, top: `${h.y}%` }}
                      aria-label={`Sửa ${h.title}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(h.id);
                      }}
                    >
                      {i + 1}
                    </button>
                  ))}
              </div>
              {active && (
                <div className="editor-fields">
                  {(["title", "subtitle", "type", "description"] as const).map(
                    (k) => (
                      <label
                        key={k}
                        className={k === "description" ? "wide" : ""}
                      >
                        {k === "title"
                          ? "Tiêu đề"
                          : k === "subtitle"
                            ? "Tiêu đề phụ"
                            : k === "type"
                              ? "Loại"
                              : "Mô tả"}
                        <input
                          value={active[k]}
                          onChange={(e) =>
                            updateHotspot({ [k]: e.target.value })
                          }
                        />
                      </label>
                    ),
                  )}
                  <p className="muted">
                    Vị trí: {active.x}% / {active.y}%
                  </p>
                  <button
                    className="danger"
                    onClick={() => {
                      update({
                        hotspots: product.hotspots.filter(
                          (h) => h.id !== selected,
                        ),
                      });
                      setSelected(null);
                    }}
                  >
                    Xóa hotspot
                  </button>
                </div>
              )}
            </div>
            {preview && (
              <div className="preview-box">
                <h2>Xem trước Explorer</h2>
                <DeviceCanvas
                  product={product}
                  active={selected}
                  onSelect={(h) => setSelected(h.id)}
                  view="top"
                  expert={true}
                />
                <DetailPanel
                  product={product}
                  active={active}
                  tab={tab}
                  setTab={setTab}
                  onClose={() => setSelected(null)}
                />
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
