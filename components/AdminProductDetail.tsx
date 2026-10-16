"use client";

import { ArrowLeft, Pencil } from "lucide-react";
import { assetUrl } from "@/lib/runtime";
import { componentGallery, productGallery } from "@/lib/gallery";
import { specLabel, type Device } from "@/lib/catalog-tools";
import type { CatalogComponent, Product } from "@/lib/types";
import ImageGallery from "./ImageGallery";

function statusLabel(status: Product["status"] | CatalogComponent["status"]) {
  return status === "published" ? "Đã xuất bản" : "Bản nháp";
}

function isProduct(item: Device): item is Product {
  return "media" in item;
}

export default function AdminProductDetail({
  item,
  onBack,
  onEdit,
}: {
  item: Device;
  onBack: () => void;
  onEdit: (item: Device) => void;
}) {
  const product = isProduct(item);
  const images = product ? productGallery(item) : componentGallery(item);
  const type = product ? "Mainboard" : item.type;
  const specs = Object.entries(item.spec).filter(([, value]) => value);

  return (
    <section className="admin-product-detail" aria-labelledby="admin-product-detail-title">
      <div className="admin-view-heading admin-detail-heading">
        <div>
          <button className="admin-back-link" onClick={onBack}>
            <ArrowLeft size={16} /> Quay lại danh sách
          </button>
          <span className="eyebrow">CHI TIẾT SẢN PHẨM · {type}</span>
          <h2 id="admin-product-detail-title">{item.name}</h2>
          <p>{item.brand || "Chưa có thương hiệu"} · {statusLabel(item.status)}</p>
        </div>
        <button className="primary" onClick={() => onEdit(item)}>
          <Pencil size={16} /> Chỉnh sửa sản phẩm
        </button>
      </div>

      <div className="admin-product-detail-grid">
        <section className="admin-detail-media" aria-label="Hình ảnh sản phẩm">
          <ImageGallery images={images} alt={item.name} />
        </section>
        <section className="admin-detail-specs" aria-labelledby="admin-detail-specs-title">
          <div className="admin-section-heading">
            <div>
              <span className="eyebrow">THÔNG TIN KỸ THUẬT</span>
              <h3 id="admin-detail-specs-title">Thông số sản phẩm</h3>
            </div>
            <span>{specs.length} thông số</span>
          </div>
          {item.description && <p className="admin-detail-description">{item.description}</p>}
          {specs.length ? (
            <dl className="admin-detail-spec-table">
              {specs.map(([key, value]) => (
                <div key={key}>
                  <dt>{specLabel(key)}</dt>
                  <dd title={value}>{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="muted">Sản phẩm chưa có thông số.</p>
          )}
        </section>
      </div>
    </section>
  );
}
