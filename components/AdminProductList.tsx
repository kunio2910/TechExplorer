"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Copy, Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { assetUrl } from "@/lib/runtime";
import { specLabel, type Device } from "@/lib/catalog-tools";
import type { CatalogComponent, CatalogComponentType, Product } from "@/lib/types";

type ProductListType = "Tất cả" | "Mainboard" | CatalogComponentType;
type ProductListItem = {
  item: Product | CatalogComponent;
  type: Exclude<ProductListType, "Tất cả">;
};

function statusLabel(status: Product["status"] | CatalogComponent["status"]) {
  return status === "published" ? "Đã xuất bản" : "Bản nháp";
}

function imageOf(item: Product | CatalogComponent) {
  return "media" in item ? item.media.top || item.media.main : item.imageUrl;
}

function searchableText(item: Product | CatalogComponent) {
  return [
    item.name,
    item.brand,
    "model" in item ? item.model : item.slug,
    ...Object.values(item.spec),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export default function AdminProductList({
  products,
  components,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  onAdd,
  onBack,
}: {
  products: Product[];
  components: CatalogComponent[];
  onView: (item: Device) => void;
  onEdit: (item: Device) => void;
  onDuplicate: (item: Device) => void;
  onDelete: (item: Device) => void;
  onAdd: (type: Exclude<ProductListType, "Tất cả">) => void;
  onBack: () => void;
}) {
  const [type, setType] = useState<ProductListType>("Tất cả");
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("all");
  const [status, setStatus] = useState("all");

  const records = useMemo<ProductListItem[]>(
    () => [
      ...products.map((item) => ({ item, type: "Mainboard" as const })),
      ...components.map((item) => ({ item, type: item.type })),
    ],
    [products, components],
  );
  const brands = useMemo(
    () =>
      [...new Set(records.map(({ item }) => item.brand).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b),
      ),
    [records],
  );
  const filtered = useMemo(
    () =>
      records.filter(({ item, type: itemType }) => {
        const matchesType = type === "Tất cả" || itemType === type;
        const matchesBrand = brand === "all" || item.brand === brand;
        const matchesStatus = status === "all" || item.status === status;
        const matchesQuery = !query.trim() || searchableText(item).includes(query.trim().toLowerCase());
        return matchesType && matchesBrand && matchesStatus && matchesQuery;
      }),
    [records, type, brand, status, query],
  );

  return (
    <section className="admin-product-list" aria-labelledby="product-list-title">
      <div className="admin-view-heading">
        <div>
          <span className="eyebrow">THƯ VIỆN SẢN PHẨM</span>
          <h2 id="product-list-title">Danh sách sản phẩm</h2>
          <p>Tra cứu, chỉnh sửa và quản lý các thiết bị đang có trong hệ thống.</p>
        </div>
        <div className="admin-list-heading-actions">
          <button className="admin-header-nav" onClick={onBack}>
            <ArrowLeft size={16} /> Về quản lý chính
          </button>
          <button className="primary admin-add-product" onClick={() => onAdd(type === "Tất cả" ? "Mainboard" : type)}>
            <Plus size={17} /> Thêm sản phẩm
          </button>
        </div>
      </div>

      <nav className="admin-list-categories" aria-label="Loại sản phẩm">
        {(["Tất cả", "Mainboard", "CPU", "GPU", "RAM", "SSD", "PSU"] as const).map((item) => (
          <button key={item} className={type === item ? "active" : ""} onClick={() => setType(item)}>
            {item}
          </button>
        ))}
      </nav>

      <div className="admin-product-filters">
        <label className="admin-search-field">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Tìm sản phẩm</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm theo tên, hãng, socket, chipset…"
          />
        </label>
        <label>
          <span>Thương hiệu</span>
          <select value={brand} onChange={(event) => setBrand(event.target.value)}>
            <option value="all">Tất cả</option>
            {brands.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label>
          <span>Trạng thái</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">Tất cả</option>
            <option value="published">Đã xuất bản</option>
            <option value="draft">Bản nháp</option>
          </select>
        </label>
      </div>

      <div className="admin-list-summary">
        <strong>{filtered.length}</strong> sản phẩm phù hợp
        {(query || brand !== "all" || status !== "all" || type !== "Tất cả") && (
          <button onClick={() => { setQuery(""); setBrand("all"); setStatus("all"); setType("Tất cả"); }}>
            Xóa bộ lọc
          </button>
        )}
      </div>

      {filtered.length ? (
        <div className="admin-product-grid">
          {filtered.map(({ item, type: itemType }) => {
            const image = imageOf(item);
            const specs = Object.entries(item.spec).filter(([, value]) => value).slice(0, 4);
            return (
              <article
                className="admin-product-card"
                key={`${itemType}-${item.id}`}
                onDoubleClick={() => onView(item)}
              >
                <div className="admin-product-card-image">
                  {image ? <img src={assetUrl(image)} alt="" loading="lazy" /> : <span>{itemType}</span>}
                  <span className={`admin-product-status ${item.status}`}>{statusLabel(item.status)}</span>
                </div>
                <div className="admin-product-card-body">
                  <div className="admin-product-card-meta"><span>{itemType}</span><span>{item.brand || "Chưa có hãng"}</span></div>
                  <h3>{item.name}</h3>
                  <div className="admin-product-specs">
                    {specs.length ? specs.map(([key, value]) => <span key={key}><b>{specLabel(key)}:</b> {value}</span>) : <span>Chưa có thông số</span>}
                  </div>
                  <div className="admin-product-card-actions">
                    <button onClick={() => onView(item)}><Eye size={15} /> Xem chi tiết</button>
                    <button onClick={() => onEdit(item)}><Pencil size={15} /> Chỉnh sửa</button>
                    <button aria-label={`Nhân đôi ${item.name}`} title="Nhân đôi" onClick={() => onDuplicate(item)}><Copy size={16} /></button>
                    <button className="danger-icon" aria-label={`Xóa ${item.name}`} title="Xóa" onClick={() => onDelete(item)}><Trash2 size={16} /></button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="admin-list-empty">
          <h3>Chưa tìm thấy sản phẩm</h3>
          <p>Thử đổi từ khóa hoặc bộ lọc, hoặc thêm thiết bị mới.</p>
          <button onClick={() => onAdd(type === "Tất cả" ? "Mainboard" : type)}><Plus size={16} /> Thêm sản phẩm</button>
        </div>
      )}
    </section>
  );
}
