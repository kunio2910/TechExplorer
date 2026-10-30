"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Copy,
  Eye,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { assetUrl } from "@/lib/runtime";
import { publishChecks, specLabel, type Device } from "@/lib/catalog-tools";
import type {
  CatalogComponent,
  CatalogComponentType,
  Product,
} from "@/lib/types";
import { collection, onSnapshot } from "firebase/firestore";
import { firestore } from "@/lib/firebase-client";

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
  onBulk,
}: {
  products: Product[];
  components: CatalogComponent[];
  onView: (item: Device) => void;
  onEdit: (item: Device) => void;
  onDuplicate: (item: Device) => void;
  onDelete: (item: Device) => void;
  onAdd: (type: Exclude<ProductListType, "Tất cả">) => void;
  onBack: () => void;
  onBulk: (
    items: Device[],
    action: "draft" | "published" | "trash",
  ) => Promise<void>;
}) {
  const [type, setType] = useState<ProductListType>("Tất cả");
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("all");
  const [status, setStatus] = useState("all");
  const [reported, setReported] = useState<string[]>([]);
  useEffect(
    () =>
      onSnapshot(
        collection(firestore, "dataReports"),
        (snapshot) =>
          setReported(
            snapshot.docs
              .filter((d) => d.data().status !== "resolved")
              .map((d) => `${d.data().deviceType}:${d.data().deviceId}`),
          ),
        () => setMessage("Chưa tải được phản hồi. Kiểm tra quyền Firestore."),
      ),
    [],
  );
  const [selected, setSelected] = useState<string[]>([]),
    [bulk, setBulk] = useState<"draft" | "published" | "trash" | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [quality, setQuality] = useState("all"),
    [sort, setSort] = useState("name"),
    [table, setTable] = useState(false),
    [page, setPage] = useState(0);
  useEffect(() => setPage(0), [type, query, brand, status, quality, sort]);

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
      records
        .filter(({ item, type: itemType }) => {
          const matchesType = type === "Tất cả" || itemType === type;
          const matchesBrand = brand === "all" || item.brand === brand;
          const matchesStatus = status === "all" || item.status === status;
          const matchesQuery =
            !query.trim() ||
            searchableText(item).includes(query.trim().toLowerCase());
          const checks = publishChecks(item, products);
          const needsWork =
            quality === "all" ||
            (quality === "image" && !imageOf(item)) ||
            (quality === "spec" &&
              checks.some((c) => c.field === "spec" && !c.valid)) ||
            (quality === "duplicate" &&
              records.some(
                (r) =>
                  r.item.id !== item.id &&
                  r.type === itemType &&
                  r.item.name.trim().toLowerCase() ===
                    item.name.trim().toLowerCase(),
              ));
          return (
            matchesType &&
            matchesBrand &&
            matchesStatus &&
            matchesQuery &&
            (needsWork ||
              (quality === "reports" &&
                reported.includes(`${itemType}:${item.id}`)))
          );
        })
        .sort((a, b) =>
          sort === "updated"
            ? (b.item.updatedAt ?? "").localeCompare(a.item.updatedAt ?? "")
            : a.item.name.localeCompare(b.item.name, "vi"),
        ),
    [records, type, brand, status, query, quality, sort, products, reported],
  );

  return (
    <section
      className="admin-product-list"
      aria-labelledby="product-list-title"
    >
      <div className="admin-view-heading">
        <div>
          <span className="eyebrow">THƯ VIỆN SẢN PHẨM</span>
          <h2 id="product-list-title">Danh sách sản phẩm</h2>
          <p>
            Tra cứu, chỉnh sửa và quản lý các thiết bị đang có trong hệ thống.
          </p>
        </div>
        <div className="admin-list-heading-actions">
          <button className="admin-header-nav" onClick={onBack}>
            <ArrowLeft size={16} /> Về quản lý chính
          </button>
          <button
            className="primary admin-add-product"
            onClick={() => onAdd(type === "Tất cả" ? "Mainboard" : type)}
          >
            <Plus size={17} /> Thêm sản phẩm
          </button>
        </div>
      </div>

      <nav className="admin-list-categories" aria-label="Loại sản phẩm">
        {(
          ["Tất cả", "Mainboard", "CPU", "GPU", "RAM", "SSD", "PSU"] as const
        ).map((item) => (
          <button
            key={item}
            className={type === item ? "active" : ""}
            onClick={() => setType(item)}
          >
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
          <select
            value={brand}
            onChange={(event) => setBrand(event.target.value)}
          >
            <option value="all">Tất cả</option>
            {brands.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Trạng thái</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">Tất cả</option>
            <option value="published">Đã xuất bản</option>
            <option value="draft">Bản nháp</option>
          </select>
        </label>
      </div>

      <div className="admin-list-summary">
        <button onClick={() => setQuality("reports")}>
          Có phản hồi cần xử lý
        </button>
        <button
          onClick={() =>
            setSelected(filtered.map((r) => `${r.type}:${r.item.id}`))
          }
        >
          Chọn các kết quả đang lọc
        </button>
        <button onClick={() => setSelected([])}>Bỏ chọn</button>
        <span>{selected.length} đã chọn</span>
        {(["draft", "published", "trash"] as const).map((action) => (
          <button
            key={action}
            disabled={!selected.length || busy}
            onClick={() => setBulk(action)}
          >
            {
              {
                draft: "Chuyển bản nháp",
                published: "Xuất bản",
                trash: "Chuyển vào thùng rác",
              }[action]
            }
          </button>
        ))}
        <label>
          Cần kiểm tra
          <select value={quality} onChange={(e) => setQuality(e.target.value)}>
            <option value="all">Tất cả</option>
            <option value="image">Thiếu ảnh</option>
            <option value="spec">Thiếu thông số chính</option>
            <option value="duplicate">Nghi trùng sản phẩm</option>
          </select>
        </label>
        <label>
          Sắp xếp
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="name">Tên sản phẩm</option>
            <option value="updated">Mới chỉnh sửa</option>
          </select>
        </label>
        <button onClick={() => setTable(!table)}>
          {table ? "Dạng thẻ" : "Dạng bảng"}
        </button>
        <strong>{filtered.length}</strong> sản phẩm phù hợp
        {(query ||
          brand !== "all" ||
          status !== "all" ||
          type !== "Tất cả") && (
          <button
            onClick={() => {
              setQuery("");
              setBrand("all");
              setStatus("all");
              setType("Tất cả");
            }}
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      {filtered.length ? (
        <div
          className={
            table ? "admin-product-grid admin-table-view" : "admin-product-grid"
          }
        >
          {filtered
            .slice(
              Math.min(page, Math.max(0, Math.ceil(filtered.length / 12) - 1)) *
                12,
              (Math.min(
                page,
                Math.max(0, Math.ceil(filtered.length / 12) - 1),
              ) +
                1) *
                12,
            )
            .map(({ item, type: itemType }) => {
              const image = imageOf(item);
              const specs = Object.entries(item.spec)
                .filter(([, value]) => value)
                .slice(0, 4);
              return (
                <article
                  className="admin-product-card"
                  key={`${itemType}-${item.id}`}
                  onDoubleClick={() => onView(item)}
                >
                  <div className="admin-product-card-image">
                    {image ? (
                      <img src={assetUrl(image)} alt="" loading="lazy" />
                    ) : (
                      <span>{itemType}</span>
                    )}
                    <span className={`admin-product-status ${item.status}`}>
                      {statusLabel(item.status)}
                    </span>
                  </div>
                  <div className="admin-product-card-body">
                    <label>
                      <input
                        type="checkbox"
                        aria-label={`Chọn ${item.name}`}
                        checked={selected.includes(`${itemType}:${item.id}`)}
                        onChange={(e) =>
                          setSelected((ids) =>
                            e.target.checked
                              ? [...ids, `${itemType}:${item.id}`]
                              : ids.filter(
                                  (id) => id !== `${itemType}:${item.id}`,
                                ),
                          )
                        }
                      />
                      Chọn
                    </label>
                    <div className="admin-product-card-meta">
                      <span>{itemType}</span>
                      <span>{item.brand || "Chưa có hãng"}</span>
                    </div>
                    <h3>{item.name}</h3>
                    <div className="admin-product-specs">
                      {specs.length ? (
                        specs.map(([key, value]) => (
                          <span key={key}>
                            <b>{specLabel(key)}:</b> {value}
                          </span>
                        ))
                      ) : (
                        <span>Chưa có thông số</span>
                      )}
                    </div>
                    <div className="admin-product-card-actions">
                      <button onClick={() => onView(item)}>
                        <Eye size={15} /> Xem chi tiết
                      </button>
                      <button onClick={() => onEdit(item)}>
                        <Pencil size={15} /> Chỉnh sửa
                      </button>
                      <button
                        aria-label={`Nhân đôi ${item.name}`}
                        title="Nhân đôi"
                        onClick={() => onDuplicate(item)}
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        className="danger-icon"
                        aria-label={`Xóa ${item.name}`}
                        title="Xóa"
                        onClick={() => onDelete(item)}
                      >
                        <Trash2 size={16} />
                      </button>
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
          <button onClick={() => onAdd(type === "Tất cả" ? "Mainboard" : type)}>
            <Plus size={16} /> Thêm sản phẩm
          </button>
        </div>
      )}
      <div className="feature-actions">
        <button
          disabled={page === 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          Trang trước
        </button>
        <span>
          Trang{" "}
          {Math.min(page + 1, Math.max(1, Math.ceil(filtered.length / 12)))} /{" "}
          {Math.max(1, Math.ceil(filtered.length / 12))}
        </span>
        <button
          disabled={(page + 1) * 12 >= filtered.length}
          onClick={() => setPage((p) => p + 1)}
        >
          Trang sau
        </button>
      </div>
      <p role="status">{message}</p>
      {bulk && (
        <div className="feature-modal-backdrop">
          <section
            className="feature-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Xác nhận thao tác hàng loạt"
          >
            <h2>
              {
                {
                  draft: "Chuyển bản nháp",
                  published: "Xuất bản",
                  trash: "Chuyển vào thùng rác",
                }[bulk]
              }
            </h2>
            <ul>
              {records
                .filter((r) => selected.includes(`${r.type}:${r.item.id}`))
                .map((r) => (
                  <li key={`${r.type}:${r.item.id}`}>{r.item.name}</li>
                ))}
            </ul>
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onBulk(
                    records
                      .filter((r) =>
                        selected.includes(`${r.type}:${r.item.id}`),
                      )
                      .map((r) => r.item),
                    bulk,
                  );
                  setSelected([]);
                  setBulk(null);
                  setMessage("Đã hoàn thành thao tác.");
                } catch (e) {
                  setMessage(
                    e instanceof Error ? e.message : "Thao tác thất bại.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              Xác nhận
            </button>
            <button disabled={busy} onClick={() => setBulk(null)}>
              Hủy
            </button>
          </section>
        </div>
      )}
    </section>
  );
}
